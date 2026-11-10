"use server";

import { createHmac, randomInt } from "node:crypto";
import { reminderDayWord } from "@/lib/rules/reminders";
import { buildCodeEmail, buildConfirmationEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/send";
import { notifyStaff } from "@/lib/notify/staff";
import { after } from "next/server";
import { bookingCopy } from "@/lib/copy/booking";
import { formatPrice } from "@/lib/dates/format";
import { addDays, isValidDate, romeDate, romeWallToUtc, weekdayName } from "@/lib/dates/rome";
import { span } from "@/lib/rules/agenda";
import { cancelLimitText, whenLong, whenShort } from "@/lib/rules/emailText";
import { isEmail, isPersonName, isPhone, LIMITS } from "@/lib/rules/forms";
import { nearestAlternatives, type Candidate } from "@/lib/rules/slots";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/supabase/env";
import { freePublicRows, loadBookingSalon, type BookingSalon } from "./server";

const errors = bookingCopy.errors;

export type Slot = { startMin: number; memberId: string };
export type DaySlots = { date: string; slots: Slot[] };
export type Alternative = { date: string; startMin: number };
export type Failure = { ok: false; error: string; kind?: "wait" | "limit" | "paused" | "conflict" | "code"; alternatives?: Alternative[]; waitSeconds?: number; remaining?: number };
const fail = (error: string, extra: Partial<Failure> = {}): Failure => ({ ok: false, error, ...extra });

/** Il codice si salva solo cifrato: HMAC con un segreto del server, legato a salone ed email. */
function hashCode(salonId: string, email: string, code: string): string {
  const secret = process.env.BOOKING_CODE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHmac("sha256", secret).update(`${salonId}:${email.trim().toLowerCase()}:${code}`).digest("hex");
}

const normalizeCode = (value: string) => value.replace(/\D/g, "");

/** Gli orari liberi di una finestra di giorni, per il selettore del cliente. */
export async function loadSlots(input: { slug: string; serviceId: string; memberId: string | null; from: string; days: number }): Promise<{ ok: true; days: DaySlots[] } | Failure> {
  const salon = await loadBookingSalon(input.slug);
  if (!salon) return fail(errors.paused, { kind: "paused" });
  if (!isValidDate(input.from) || !Number.isInteger(input.days) || input.days < 1 || input.days > 21) return fail(errors.generic);
  const rows = await freePublicRows(salon.id, input.serviceId, input.memberId, input.from, input.days);
  const byDay = new Map<string, Map<number, Slot>>();
  for (const r of rows) {
    const day = byDay.get(r.date) ?? new Map<number, Slot>();
    if (!day.has(r.startMin)) day.set(r.startMin, { startMin: r.startMin, memberId: r.memberId }); // lo stesso orario di più barbieri conta una volta
    byDay.set(r.date, day);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, m]) => ({ date, slots: [...m.values()].sort((a, b) => a.startMin - b.startMin) }));
  return { ok: true, days };
}

export type RequestInput = {
  slug: string;
  serviceId: string;
  memberId: string | null;
  date: string;
  startMin: number;
  name: string;
  email: string;
  phone: string;
  privacy: boolean;
  marketing: boolean;
  /** Campo nascosto: se compilato è un programma, non una persona. */
  website?: string;
};

async function alternativesFor(salon: BookingSalon, serviceId: string, memberId: string | null, wanted: { date: string; startMin: number }): Promise<Alternative[]> {
  const rows = await freePublicRows(salon.id, serviceId, memberId, wanted.date, 7);
  const candidates: Candidate[] = rows.map((r) => ({ date: r.date, startMin: r.startMin, memberId: r.memberId }));
  return nearestAlternatives(candidates, wanted).map((a) => ({ date: a.date, startMin: a.startMin }));
}

/** Passo 3 → codice: ricontrolla regole e orario, poi manda il codice via email. */
export async function requestCode(input: RequestInput): Promise<{ ok: true } | Failure> {
  if (input.website) return { ok: true }; // trappola per i programmi: finge di aver fatto
  const salon = await loadBookingSalon(input.slug);
  if (!salon) return fail(errors.paused, { kind: "paused" });

  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (!isPersonName(name, LIMITS.clientName)) return fail(errors.name);
  if (!isEmail(email)) return fail(bookingCopy.emailError);
  if (phone && !isPhone(phone)) return fail(errors.phone);
  if (!input.privacy) return fail(bookingCopy.privacyError);
  if (!isValidDate(input.date) || !Number.isInteger(input.startMin) || input.startMin < 0 || input.startMin >= 1440) return fail(errors.generic);

  const admin = createAdminClient();
  const { data: service } = await admin.from("services").select("id").eq("id", input.serviceId).eq("salon_id", salon.id).eq("active", true).maybeSingle();
  if (!service) return fail(errors.gone);
  if (input.memberId && !salon.members.some((m) => m.id === input.memberId)) return fail(errors.generic);

  // L'orario deve essere libero adesso: meglio dirlo prima di mandare l'email.
  const rows = await freePublicRows(salon.id, service.id, input.memberId, input.date, 1);
  if (!rows.some((r) => r.startMin === input.startMin)) {
    const alternatives = await alternativesFor(salon, service.id, input.memberId, input);
    return fail(errors.taken, { kind: "conflict", alternatives });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const payload = { serviceId: service.id, memberId: input.memberId, date: input.date, startMin: input.startMin, name, phone, marketing: input.marketing };
  const { data, error } = await admin.rpc("request_booking_code", { p_salon: salon.id, p_email: email, p_code_hash: hashCode(salon.id, email, code), p_payload: payload });
  if (error || !data) return fail(errors.generic);
  const result = data as { status: "sent" | "wait" | "limit"; wait_seconds?: number };
  if (result.status === "wait") return fail(errors.wait(result.wait_seconds ?? 60), { kind: "wait", waitSeconds: result.wait_seconds ?? 60 });
  if (result.status === "limit") return fail(errors.limit, { kind: "limit" });

  const built = await buildCodeEmail({
    salonName: salon.name,
    code,
    footer: [salon.name, salon.address, salon.phone].filter(Boolean).join(" · "),
  });
  const sent = await sendEmail({ to: email, subject: built.subject, html: built.html, text: built.text, fromName: salon.name });
  if (!sent.ok) {
    console.error("invio codice non riuscito:", sent.error);
    return fail(errors.send);
  }
  return { ok: true };
}

export type Confirmed = {
  ok: true;
  seeYou: string; // "venerdì"
  firstName: string;
  rows: Array<{ label: string; value: string }>;
  code: string;
  manageUrl: string;
  email: string;
  cancelUntil: string | null;
  date: string;
  startMin: number;
};

/** Codice → prenotazione. `override` serve quando l'orario è stato preso e il cliente ne sceglie un altro: il codice resta valido. */
export async function confirmCode(input: { slug: string; email: string; code: string; override?: { date: string; startMin: number } }): Promise<Confirmed | Failure> {
  const salon = await loadBookingSalon(input.slug);
  if (!salon) return fail(errors.paused, { kind: "paused" });
  const email = input.email.trim().toLowerCase();
  const code = normalizeCode(input.code);
  if (code.length !== 6) return fail(errors.wrong(5), { kind: "code" });

  const admin = createAdminClient();
  const { data: checked, error: checkError } = await admin.rpc("check_booking_code", { p_salon: salon.id, p_email: email, p_code_hash: hashCode(salon.id, email, code) });
  if (checkError || !checked) return fail(errors.generic);
  const check = checked as { status: "ok" | "wrong" | "locked" | "expired" | "none"; remaining?: number; payload?: { serviceId: string; memberId: string | null; date: string; startMin: number; name: string; phone: string; marketing: boolean } };
  if (check.status === "wrong") return fail(errors.wrong(check.remaining ?? 0), { kind: "code", remaining: check.remaining });
  if (check.status === "locked") return fail(errors.locked, { kind: "code" });
  if (check.status === "expired") return fail(errors.expired, { kind: "code" });
  if (check.status !== "ok" || !check.payload) return fail(errors.none, { kind: "code" });

  const p = check.payload;
  const wanted = input.override && isValidDate(input.override.date) && Number.isInteger(input.override.startMin) ? input.override : { date: p.date, startMin: p.startMin };
  const startsAt = romeWallToUtc(wanted.date, wanted.startMin);

  const { data, error } = await admin.rpc("confirm_online_booking", {
    p_salon: salon.id,
    p_service: p.serviceId,
    p_member: p.memberId as string,
    p_starts: startsAt.toISOString(),
    p_name: p.name,
    p_email: email,
    p_phone: p.phone,
    p_marketing: p.marketing,
  });
  if (error || !data) {
    const taken = error?.code === "23P01" || error?.message?.includes("slot_taken");
    if (taken) {
      const alternatives = await alternativesFor(salon, p.serviceId, p.memberId, wanted);
      return fail(errors.taken, { kind: "conflict", alternatives });
    }
    if (error?.message?.includes("service_gone")) return fail(errors.gone);
    if (error?.message?.includes("booking_closed")) return fail(errors.paused, { kind: "paused" });
    return fail(errors.generic);
  }
  await admin.rpc("consume_booking_code", { p_salon: salon.id, p_email: email });
  const apptId = (data as { id: string }).id;
  after(() => notifyStaff("new", apptId));

  const appt = data as { id: string; public_code: string; manage_token: string; member_id: string; starts_at: string; service_name: string; price_cents: number };
  const { data: service } = await admin.from("services").select("duration_min").eq("id", p.serviceId).maybeSingle();
  const barber = salon.members.length > 1 ? (salon.members.find((m) => m.id === appt.member_id)?.name ?? null) : null;
  const date = romeDate(new Date(appt.starts_at));
  const manageUrl = `${env.siteUrl()}/${salon.slug}/prenotazione/${appt.manage_token}`;
  const cancelUntil = salon.cancelOnline ? cancelLimitText(new Date(appt.starts_at), salon.cancelLimitMin) : null;
  const firstName = p.name.split(" ")[0] ?? p.name;
  const serviceLine = `${appt.service_name}${service ? ` · ${span(service.duration_min)}` : ""}`;
  const price = salon.showPrices ? formatPrice(appt.price_cents) : null;

  // L'email di conferma è un di più: se non parte, la prenotazione c'è comunque.
  const built = await buildConfirmationEmail({
    salonName: salon.name,
    firstName,
    weekday: weekdayName(date).toLowerCase(),
    day: reminderDayWord(date, romeDate(new Date()), addDays(romeDate(new Date()), 1)),
    logoUrl: salon.logoUrl,
    when: whenShort(date, wanted.startMin),
    subjectWhen: whenLong(date, wanted.startMin),
    service: serviceLine,
    barber,
    price,
    address: salon.address,
    manageUrl,
    calendarUrl: `${manageUrl}/calendario.ics`,
    cancelUntil,
    phone: salon.phone,
    footer: [salon.name, salon.address, salon.phone].filter(Boolean).join(" · "),
  });
  const sent = await sendEmail({ to: email, subject: built.subject, html: built.html, text: built.text, fromName: salon.name });
  if (!sent.ok) console.error("invio conferma non riuscito:", sent.error);

  const rows = [
    { label: "Quando", value: whenShort(date, wanted.startMin) },
    { label: "Servizio", value: serviceLine },
    ...(barber ? [{ label: "Barbiere", value: barber }] : []),
    ...(price ? [{ label: "Prezzo", value: `${price} in negozio` }] : []),
    ...(salon.address ? [{ label: "Dove", value: salon.address }] : []),
  ];
  return { ok: true, seeYou: weekdayName(date).toLowerCase(), firstName, rows, code: appt.public_code, manageUrl, email, cancelUntil, date, startMin: wanted.startMin };
}
