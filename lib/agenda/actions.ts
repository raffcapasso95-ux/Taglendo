"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { emailCancelledBySalon, emailConfirmedBySalon, emailMoved } from "@/lib/notify/clientMail";
import { requireSalon } from "@/lib/auth/session";
import { agendaCopy } from "@/lib/copy/agenda";
import { isValidDate, romeDate, romeMinutes, romeWallToUtc } from "@/lib/dates/rome";
import { buildDay, clock, type ApptStatus } from "@/lib/rules/agenda";
import { isEmail, isPhone, LIMITS } from "@/lib/rules/forms";
import { gridSlots, nearestAlternatives, type Candidate } from "@/lib/rules/slots";
import { createClient } from "@/lib/supabase/server";
import { appointmentsOn, hoursFor, operatorsOf } from "./day";

const { errors, conflict: conflictCopy } = agendaCopy;

export type Alternative = { date: string; startMin: number; memberId: string };
export type Conflict = { title: string; text: string; alternatives: Alternative[] };
export type Failure = { ok: false; error: string; conflict?: Conflict };
export type Created = { ok: true; id: string; clientId: string; clientName: string; date: string; startMin: number };

type NewClient = { name: string; phone?: string | null; /** Per la conferma e il promemoria via email. */ email?: string | null; /** Colore delle iniziali (0–4). */ avatarColor?: number | null };
export type CreateInput = {
  clientId?: string | null;
  newClient?: NewClient | null;
  serviceId: string;
  /** null = chiunque: il primo barbiere libero, in ordine di poltrona. */
  memberId: string | null;
  date: string;
  startMin: number;
  source?: "manuale" | "in_negozio";
  /** Prezzo diverso da quello di listino, solo per questo appuntamento (centesimi). */
  priceCents?: number | null;
  priceNote?: string | null;
  /** NUOVO: durata diversa da quella di listino, solo per questo appuntamento (minuti, multipli di 5). */
  durationMin?: number | null;
};

/** Durata valida per un appuntamento (5–480 minuti, a passi di 5), altrimenti null = quella del listino. */
const customDuration = (d: number | null | undefined) => (typeof d === "number" && Number.isInteger(d) && d >= 5 && d <= 480 && d % 5 === 0 ? d : null);

const fail = (error: string, conflict?: Conflict): Failure => ({ ok: false, error, conflict });
const isOverlap = (e: { code?: string } | null) => e?.code === "23P01";

async function editor() {
  const m = await requireSalon();
  const supabase = await createClient();
  let canEdit = m.role === "owner";
  if (!canEdit) {
    const { data } = await supabase.from("salons").select("barbers_edit").eq("id", m.salon.id).single();
    canEdit = data?.barbers_edit ?? false;
  }
  return { supabase, salon: m.salon, canEdit, role: m.role };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Gli orari liberi di un giorno (da free_slots): per ogni orario, i barbieri liberi in ordine di poltrona. */
async function freeRows(supabase: Supabase, salonId: string, serviceId: string, memberId: string | null, from: string, days: number, exclude?: string | null, durationMin?: number | null) {
  const { data } = await supabase.rpc("free_slots", {
    p_salon: salonId,
    p_service: serviceId,
    // Il tipo generato non ammette null, ma la funzione sì: null = tutti i barbieri.
    p_member: memberId as string,
    p_from: from,
    p_days: days,
    p_exclude: exclude ?? undefined,
    p_duration: durationMin ?? undefined,
  });
  return (data ?? []).map((r) => ({
    memberId: r.member_id,
    date: romeDate(new Date(r.starts_at)),
    startMin: romeMinutes(new Date(r.starts_at)),
    startsAt: r.starts_at,
    endsAt: r.ends_at,
  }));
}

async function conflictFor(supabase: Supabase, salonId: string, serviceId: string, memberId: string | null, wanted: { date: string; startMin: number }, exclude?: string | null, durationMin?: number | null): Promise<Conflict> {
  const rows = await freeRows(supabase, salonId, serviceId, memberId, wanted.date, 7, exclude, durationMin);
  const candidates: Candidate[] = rows.map((r) => ({ date: r.date, startMin: r.startMin, memberId: r.memberId }));
  const alternatives = nearestAlternatives(candidates, wanted);
  return {
    title: conflictCopy.title,
    text: conflictCopy.text(clock(wanted.startMin), alternatives[0] ? clock(alternatives[0].startMin) : null),
    alternatives,
  };
}

/** Il cliente: uno esistente o uno nuovo (nome libero, telefono facoltativo). */
type ClientResult = { id: string; created: boolean; name: string | null } | { error: string };

async function resolveClient(supabase: Supabase, salonId: string, input: Pick<CreateInput, "clientId" | "newClient">): Promise<ClientResult> {
  if (input.clientId) return { id: input.clientId, created: false, name: null };
  const name = input.newClient?.name?.trim() ?? "";
  if (!name || name.length > LIMITS.clientName) return { error: errors.clientName };
  const phone = input.newClient?.phone?.trim() || null;
  if (phone && !isPhone(phone)) return { error: errors.phone };
  const email = input.newClient?.email?.trim().toLowerCase() || null;
  if (email && !isEmail(email)) return { error: errors.email };
  const color = input.newClient?.avatarColor;
  const avatar_color = typeof color === "number" && Number.isInteger(color) && color >= 0 && color <= 4 ? color : null;
  const { data, error } = await supabase.from("clients").insert({ salon_id: salonId, name, phone, email, avatar_color }).select("id").single();
  if (error || !data) return { error: errors.generic };
  return { id: data.id, created: true, name };
}

async function insertAppointment(
  supabase: Supabase,
  p: { salonId: string; memberId: string; clientId: string; service: { id: string; name: string; price_cents: number }; startsAt: string; endsAt: string; source: "manuale" | "in_negozio"; price?: { cents: number; note: string | null } | null },
) {
  return supabase
    .from("appointments")
    .insert({
      salon_id: p.salonId,
      member_id: p.memberId,
      client_id: p.clientId,
      service_id: p.service.id,
      service_name: p.service.name, // nome e prezzo si copiano nell'appuntamento
      // prezzo di listino copiato alla prenotazione; se il salone fa uno sconto, price_cents è quello pagato
      list_price_cents: p.service.price_cents,
      price_cents: p.price?.cents ?? p.service.price_cents,
      price_note: p.price?.note ?? null,
      starts_at: p.startsAt,
      ends_at: p.endsAt,
      source: p.source,
    })
    .select("id")
    .single();
}

/** Prezzo diverso dal listino: intero in centesimi, da 0 (omaggio) a 10.000 €; il motivo fino a 60 caratteri. */
function customPrice(input: Pick<CreateInput, "priceCents" | "priceNote">, listCents: number): { cents: number; note: string | null } | null | "invalid" {
  if (input.priceCents == null) return null;
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 1_000_000) return "invalid";
  const note = input.priceNote?.trim().slice(0, 60) || null;
  return input.priceCents === listCents && !note ? null : { cents: input.priceCents, note };
}

/** Fissa un appuntamento. Ricontrolla gli orari liberi sul server; il vincolo del database è l'ultima parola. */
export async function createAppointment(input: CreateInput): Promise<Created | Failure> {
  const { supabase, salon, canEdit } = await editor();
  if (!canEdit) return fail(errors.notAllowed);
  if (!isValidDate(input.date) || !Number.isInteger(input.startMin) || input.startMin < 0 || input.startMin >= 1440) return fail(errors.generic);

  const { data: service } = await supabase.from("services").select("id, name, price_cents").eq("id", input.serviceId).eq("salon_id", salon.id).eq("active", true).maybeSingle();
  if (!service) return fail(errors.generic);

  const wanted = { date: input.date, startMin: input.startMin };
  const duration = customDuration(input.durationMin);
  const rows = await freeRows(supabase, salon.id, service.id, input.memberId, input.date, 1, null, duration);
  const slot = rows.find((r) => r.startMin === input.startMin);
  if (!slot) return fail(conflictCopy.title, await conflictFor(supabase, salon.id, service.id, input.memberId, wanted, null, duration));

  const price = customPrice(input, service.price_cents);
  if (price === "invalid") return fail(errors.generic);

  const client = await resolveClient(supabase, salon.id, input);
  if ("error" in client) return fail(client.error);

  const { data, error } = await insertAppointment(supabase, {
    salonId: salon.id,
    memberId: slot.memberId,
    clientId: client.id,
    service,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    source: input.source ?? "manuale",
    price,
  });
  if (error || !data) {
    if (client.created) await supabase.from("clients").delete().eq("id", client.id);
    if (isOverlap(error)) return fail(conflictCopy.title, await conflictFor(supabase, salon.id, service.id, input.memberId, wanted, null, duration));
    return fail(errors.generic);
  }
  revalidatePath("/agenda");
  const clientName = client.name ?? (await supabase.from("clients").select("name").eq("id", client.id).single()).data?.name ?? "";
  // anche quando lo fissa il salone, il cliente con un'email riceve la conferma (con il link per gestirla)
  const apptId = data.id;
  after(() => emailConfirmedBySalon(apptId));
  return { ok: true, id: data.id, clientId: client.id, clientName, date: input.date, startMin: input.startMin };
}

/** "Cliente in negozio": il primo posto libero da adesso, a partire proprio da adesso se il barbiere è libero. */
export async function walkIn(input: Pick<CreateInput, "clientId" | "newClient" | "serviceId" | "memberId" | "priceCents" | "priceNote" | "durationMin">): Promise<Created | Failure> {
  const { supabase, salon, canEdit } = await editor();
  if (!canEdit) return fail(errors.notAllowed);
  const { data: service } = await supabase.from("services").select("id, name, price_cents, duration_min").eq("id", input.serviceId).eq("salon_id", salon.id).eq("active", true).maybeSingle();
  if (!service) return fail(errors.generic);

  const now = new Date();
  const today = romeDate(now);
  const nowMin = romeMinutes(now);
  const [hours, operators, appts] = await Promise.all([hoursFor(supabase, salon.id, today), operatorsOf(supabase, salon.id), appointmentsOn(supabase, salon.id, today)]);
  const pool = input.memberId ? operators.filter((o) => o.id === input.memberId) : operators;
  const day = buildDay({ date: today, isToday: true, nowMin, hours, operators: pool, appts });

  const minutes = customDuration(input.durationMin) ?? service.duration_min;
  let best: { memberId: string; start: number } | null = null;
  for (const column of day.columns) {
    for (const [a, b] of column.gaps) {
      const start = Math.max(a, nowMin);
      if (b - start >= minutes && (!best || start < best.start)) best = { memberId: column.operator.id, start };
    }
  }
  if (!best) return fail(errors.noRoom);

  const price = customPrice(input, service.price_cents);
  if (price === "invalid") return fail(errors.generic);

  const client = await resolveClient(supabase, salon.id, input);
  if ("error" in client) return fail(client.error);

  const startsAt = romeWallToUtc(today, best.start);
  const endsAt = new Date(startsAt.getTime() + minutes * 60000);
  const { data, error } = await insertAppointment(supabase, {
    salonId: salon.id,
    memberId: best.memberId,
    clientId: client.id,
    service,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    source: "in_negozio",
    price,
  });
  if (error || !data) {
    if (client.created) await supabase.from("clients").delete().eq("id", client.id);
    return fail(errors.generic);
  }
  revalidatePath("/agenda");
  const name = client.name ?? (await supabase.from("clients").select("name").eq("id", client.id).single()).data?.name ?? "";
  return { ok: true, id: data.id, clientId: client.id, clientName: name, date: today, startMin: best.start };
}

/** `memberIds`: chi è libero a quell'ora (con «Chiunque» si mostra chi prenderebbe l'appuntamento). */
export type SlotsResult = { closed: boolean; durationMin: number; slots: Array<{ startMin: number; free: boolean; memberIds: string[] }> };

/** Gli orari di un giorno per il selettore: i liberi si scelgono, gli occupati si mostrano barrati. */
export async function listSlots(input: { serviceId: string; memberId: string | null; date: string; excludeId?: string | null; durationMin?: number | null }): Promise<SlotsResult> {
  const { supabase, salon } = await editor();
  if (!isValidDate(input.date)) return { closed: false, durationMin: 0, slots: [] };
  const { data: service } = await supabase.from("services").select("duration_min").eq("id", input.serviceId).eq("salon_id", salon.id).maybeSingle();
  if (!service) return { closed: false, durationMin: 0, slots: [] };

  const now = new Date();
  const hours = await hoursFor(supabase, salon.id, input.date);
  const duration = customDuration(input.durationMin) ?? service.duration_min;
  if (hours.closed) return { closed: true, durationMin: duration, slots: [] };
  const rows = await freeRows(supabase, salon.id, input.serviceId, input.memberId, input.date, 1, input.excludeId, duration);
  const byStart = new Map<number, string[]>();
  for (const r of rows) byStart.set(r.startMin, [...(byStart.get(r.startMin) ?? []), r.memberId]);
  const from = input.date === romeDate(now) ? romeMinutes(now) : 0;
  const slots = gridSlots(hours, duration, new Set(byStart.keys()), from).map((s) => ({ ...s, memberIds: byStart.get(s.startMin) ?? [] }));
  return { closed: false, durationMin: duration, slots };
}

export type Detail = {
  id: string;
  clientId: string | null;
  clientName: string;
  phone: string | null;
  note: string;
  serviceId: string | null;
  serviceName: string;
  priceCents: number;
  /** Prezzo di listino copiato alla prenotazione, per il confronto con quello fatto. */
  listPriceCents: number;
  priceNote: string;
  date: string;
  startMin: number;
  endMin: number;
  memberId: string;
  memberName: string;
  status: ApptStatus;
  source: "manuale" | "online" | "in_negozio";
};

/** Tutto su un appuntamento: il telefono solo se chi guarda può vederlo (vista clients_visible). */
export async function getAppointment(id: string): Promise<Detail | null> {
  const { supabase } = await editor();
  const { data: a } = await supabase
    .from("appointments")
    .select("id, client_id, service_id, service_name, price_cents, list_price_cents, price_note, starts_at, ends_at, status, source, member_id, member:members(name), client:clients(name, note)")
    .eq("id", id)
    .maybeSingle();
  if (!a) return null;
  let phone: string | null = null;
  if (a.client_id) {
    const { data } = await supabase.from("clients_visible").select("phone").eq("id", a.client_id).maybeSingle();
    phone = data?.phone ?? null;
  }
  const start = new Date(a.starts_at);
  const end = new Date(a.ends_at);
  return {
    id: a.id,
    clientId: a.client_id,
    clientName: a.client?.name ?? "Cliente",
    phone,
    note: a.client?.note ?? "",
    serviceId: a.service_id,
    serviceName: a.service_name,
    priceCents: a.price_cents,
    listPriceCents: a.list_price_cents ?? a.price_cents,
    priceNote: a.price_note ?? "",
    date: romeDate(start),
    startMin: romeMinutes(start),
    endMin: romeDate(end) === romeDate(start) ? romeMinutes(end) : 1440,
    memberId: a.member_id,
    memberName: a.member?.name ?? "",
    status: a.status,
    source: a.source,
  };
}

/** Cambia lo stato: confermato, completato o non presentato. */
export async function setAppointmentStatus(id: string, status: "confermato" | "completato" | "non_presentato"): Promise<{ ok: true } | Failure> {
  const { supabase, canEdit } = await editor();
  if (!canEdit) return fail(errors.notAllowed);
  const { data, error } = await supabase.from("appointments").update({ status }).eq("id", id).neq("status", "annullato").select("id");
  if (isOverlap(error)) return fail(conflictCopy.title);
  if (error || !data?.length) return fail(errors.generic);
  revalidatePath("/agenda");
  return { ok: true };
}

/** Annulla da parte del salone: l'orario torna libero. */
export async function cancelAppointment(id: string): Promise<{ ok: true } | Failure> {
  const { supabase, canEdit } = await editor();
  if (!canEdit) return fail(errors.notAllowed);
  const { data, error } = await supabase.from("appointments").update({ status: "annullato", cancelled_by: "salone" }).eq("id", id).neq("status", "annullato").select("id");
  if (error || !data?.length) return fail(errors.generic);
  after(() => emailCancelledBySalon(id).catch((e) => console.error("email di annullamento:", e)));
  revalidatePath("/agenda");
  return { ok: true };
}

/** Sposta un appuntamento a un altro giorno o orario, con lo stesso barbiere. */
/**
 * Sposta un appuntamento a un altro giorno e orario. `memberId` cambia anche il barbiere: senza, resta quello di prima;
 * `null` vuol dire «chi è libero» e vince il primo libero in ordine di poltrona.
 */
export async function moveAppointment(input: { id: string; date: string; startMin: number; memberId?: string | null }): Promise<{ ok: true; date: string; startMin: number } | Failure> {
  const { supabase, salon, canEdit } = await editor();
  if (!canEdit) return fail(errors.notAllowed);
  if (!isValidDate(input.date)) return fail(errors.generic);
  const { data: appt } = await supabase.from("appointments").select("id, member_id, service_id, status, starts_at, ends_at").eq("id", input.id).maybeSingle();
  if (!appt || appt.status === "annullato") return fail(errors.gone);
  if (!appt.service_id) return fail(errors.generic);

  const target = input.memberId === undefined ? appt.member_id : input.memberId;
  const wanted = { date: input.date, startMin: input.startMin };
  // spostando, l'appuntamento tiene la sua durata (anche se diversa dal listino)
  const own = Math.round((new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()) / 60000);
  const rows = await freeRows(supabase, salon.id, appt.service_id, target, input.date, 1, appt.id, own);
  const slot = rows.find((r) => r.startMin === input.startMin);
  if (!slot) return fail(conflictCopy.title, await conflictFor(supabase, salon.id, appt.service_id, target, wanted, appt.id, own));

  // spostato: il promemoria, se era già partito, riparte per il nuovo orario
  const { data, error } = await supabase
    .from("appointments")
    .update({ starts_at: slot.startsAt, ends_at: slot.endsAt, member_id: slot.memberId, reminder_sent_at: null })
    .eq("id", appt.id)
    .select("id");
  if (isOverlap(error)) return fail(conflictCopy.title, await conflictFor(supabase, salon.id, appt.service_id, target, wanted, appt.id, own));
  if (error || !data?.length) return fail(errors.generic);
  const before = new Date(appt.starts_at);
  after(() => emailMoved(appt.id, before).catch((e) => console.error("email di spostamento:", e)));
  revalidatePath("/agenda");
  return { ok: true, date: input.date, startMin: input.startMin };
}

/** Cambia il prezzo di un appuntamento già fissato (sconto alla cassa, omaggio…). Il listino non cambia. */
export async function setAppointmentPrice(input: { id: string; priceCents: number; note?: string | null }): Promise<{ ok: true; priceCents: number; priceNote: string } | Failure> {
  const { supabase, canEdit } = await editor();
  if (!canEdit) return fail(errors.notAllowed);
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 1_000_000) return fail(errors.generic);
  const note = input.note?.trim().slice(0, 60) || null;
  const { data, error } = await supabase.from("appointments").update({ price_cents: input.priceCents, price_note: note }).eq("id", input.id).neq("status", "annullato").select("id");
  if (error || !data?.length) return fail(errors.generic);
  revalidatePath("/agenda");
  return { ok: true, priceCents: input.priceCents, priceNote: note ?? "" };
}
