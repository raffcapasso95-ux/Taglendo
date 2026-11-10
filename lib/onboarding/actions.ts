"use server";

import { redirect } from "next/navigation";
import { requireSalon } from "@/lib/auth/session";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { isEmail, isPhone, LIMITS } from "@/lib/rules/forms";
import { inviteExpiry } from "@/lib/rules/invite";
import { newToken, sendInviteEmail } from "@/lib/operators/invite";
import { validateRanges, type HoursError, type Range, type WeekDay } from "@/lib/rules/hours";
import { canSaveWeek } from "@/lib/rules/listino";
import { listinoCopy } from "@/lib/copy/listino";
import { isValidSlug, slugify } from "@/lib/rules/slug";
import { saveWeek } from "@/lib/hours/week";
import { createClient } from "@/lib/supabase/server";

const { errors } = onboardingCopy;

export type StepState = { error?: string; field?: string };

const HOURS_ERRORS: Record<HoursError, string> = {
  no_days: errors.noDays,
  open_after_close: errors.openAfterClose,
  break_invalid: errors.breakInvalid,
  break_outside: errors.breakOutside,
};

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

function payload<T>(data: FormData): T | null {
  try {
    return JSON.parse(text(data, "payload")) as T;
  } catch {
    return null;
  }
}

/** Solo il titolare fa il primo avvio. */
async function owner() {
  const membership = await requireSalon({ allowOnboarding: true });
  if (membership.role !== "owner") redirect("/agenda");
  return membership;
}

/** Il passo salvato non torna mai indietro: tornare a un passo precedente non azzera i successivi. */
async function advanceTo(salonId: string, current: number, to: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("salons")
    .update({ onboarding_step: Math.max(current, to) })
    .eq("id", salonId);
  return error;
}

/* ───────────── Passo 1 · il salone ───────────── */

export async function saveSalon(_prev: StepState, data: FormData): Promise<StepState> {
  const { salon } = await owner();
  const name = text(data, "name").trim();
  const address = text(data, "address").trim();
  const phone = text(data, "phone").trim();
  const slugAuto = text(data, "slugAuto") === "1";
  let slug = text(data, "slug").trim().toLowerCase();

  if (!name || name.length > LIMITS.salonName) return { field: "name", error: errors.name };
  if (!address || address.length > 120) return { field: "address", error: errors.address };
  if (!phone || !isPhone(phone)) return { field: "phone", error: errors.phone };

  const supabase = await createClient();

  // Il link generato dal nome, se è già preso, prende un numero in coda (-2, -3, …).
  if (slugAuto) slug = slugify(name);
  if (!isValidSlug(slug)) return { field: "slug", error: errors.slugInvalid };

  const isFree = async (candidate: string) => {
    if (candidate === salon.slug) return true;
    const { data: free } = await supabase.rpc("slug_available", { p_slug: candidate });
    return free === true;
  };
  if (!(await isFree(slug))) {
    if (!slugAuto) return { field: "slug", error: errors.slugTaken };
    const base = slug.slice(0, 56);
    let found: string | null = null;
    for (let n = 2; n <= 30 && !found; n++) {
      if (await isFree(`${base}-${n}`)) found = `${base}-${n}`;
    }
    if (!found) return { field: "slug", error: errors.slugTaken };
    slug = found;
  }

  const { error } = await supabase.from("salons").update({ name, address, phone, slug }).eq("id", salon.id);
  if (error) return error.code === "23505" ? { field: "slug", error: errors.slugTaken } : { error: errors.generic };
  if (await advanceTo(salon.id, salon.onboarding_step, 2)) return { error: errors.generic };
  redirect("/primo-avvio/2");
}

/* ───────────── Passo 2 · orari ───────────── */

/** Gli orari giorno per giorno (come in Listino › Orari): ogni giorno aperto ha fasce valide, almeno un giorno aperto. */
export async function saveHours(_prev: StepState, data: FormData): Promise<StepState> {
  const { salon } = await owner();
  const week = payload<WeekDay[]>(data);
  if (!Array.isArray(week) || week.length !== 7) return { error: errors.generic };
  const clean: WeekDay[] = week.map((d) => ({ closed: Boolean(d?.closed), ranges: (d?.ranges ?? []).map(([a, b]): Range => [Math.trunc(Number(a)), Math.trunc(Number(b))]) }));
  for (const d of clean) {
    if (d.ranges.length > 0 && validateRanges(d.ranges)) return { error: listinoCopy.errors.hours };
    if (!d.closed && d.ranges.length === 0) return { error: listinoCopy.errors.hours };
  }
  if (!clean.some((d) => !d.closed)) return { field: "days", error: HOURS_ERRORS.no_days };
  if (!canSaveWeek(clean)) return { error: listinoCopy.errors.hours };

  const supabase = await createClient();
  if (!(await saveWeek(supabase, salon.id, clean))) return { error: errors.generic };
  if (await advanceTo(salon.id, salon.onboarding_step, 3)) return { error: errors.generic };
  redirect("/primo-avvio/3");
}

/* ───────────── Passo 3 · servizi ───────────── */

type ServicePayload = { name: string; durationMin: number; priceCents: number };

export async function saveServices(_prev: StepState, data: FormData): Promise<StepState> {
  const { salon } = await owner();
  const list = payload<ServicePayload[]>(data);
  if (!list || !Array.isArray(list)) return { error: errors.generic };
  if (list.length === 0) return { error: errors.noServices };

  for (const s of list) {
    const name = String(s.name ?? "").trim();
    if (!name || name.length > LIMITS.serviceName) return { field: "name", error: errors.serviceName };
    if (!Number.isInteger(s.durationMin) || s.durationMin < 5 || s.durationMin > 240) {
      return { field: "duration", error: errors.serviceDuration };
    }
    if (!Number.isInteger(s.priceCents) || s.priceCents < 0 || s.priceCents > 999_900) {
      return { field: "price", error: errors.servicePrice };
    }
  }

  const supabase = await createClient();
  // Nel primo avvio non ci sono ancora appuntamenti: si riscrive l'intero listino.
  const { error: delError } = await supabase.from("services").delete().eq("salon_id", salon.id);
  if (delError) return { error: errors.generic };
  const { error } = await supabase.from("services").insert(
    list.map((s, i) => ({
      salon_id: salon.id,
      name: s.name.trim(),
      duration_min: s.durationMin,
      price_cents: s.priceCents,
      sort: i + 1,
    })),
  );
  if (error) return { error: errors.generic };
  const { error: pricesError } = await supabase.from("salons").update({ show_prices: text(data, "showPrices") !== "0" }).eq("id", salon.id);
  if (pricesError) return { error: errors.generic };
  if (await advanceTo(salon.id, salon.onboarding_step, 4)) return { error: errors.generic };
  redirect("/primo-avvio/4");
}

/* ───────────── Passo 4 · poltrone ───────────── */

type ChairsPayload = { chairs: number; names: string[]; emails?: string[] };

/**
 * Le poltrone: un nome per ogni barbiere e, se c'è, la sua email. Con l'email parte subito l'invito (F5)
 * per registrarsi o accedere e vedere la propria agenda; senza, l'invito si manda dopo da Operatori.
 */
export async function saveChairs(_prev: StepState, data: FormData): Promise<StepState> {
  const membership = await owner();
  const { salon } = membership;
  const p = payload<ChairsPayload>(data);
  if (!p || ![1, 2, 3].includes(p.chairs)) return { error: errors.generic };

  const names = (p.names ?? []).slice(0, p.chairs - 1).map((n) => String(n ?? "").trim());
  if (names.length < p.chairs - 1 || names.some((n) => !n || n.length > LIMITS.memberName)) {
    return { field: "names", error: errors.barberName };
  }
  const emails = names.map((_, i) => String(p.emails?.[i] ?? "").trim().toLowerCase());
  const badEmail = emails.findIndex((e) => e && !isEmail(e));
  if (badEmail >= 0) return { field: `email${badEmail}`, error: errors.barberEmail };
  if (emails.some((e, i) => e && emails.indexOf(e) !== i)) return { field: `email${emails.lastIndexOf(emails.find((e, i) => e && emails.indexOf(e) !== i)!)}`, error: errors.barberEmailTwice };

  const supabase = await createClient();
  // Le poltrone senza account si riscrivono; gli inviti con la stessa email restano validi (niente seconda email).
  const { data: before } = await supabase.from("members").select("chair_no, invite_email, invite_token, invite_expires_at").eq("salon_id", salon.id).eq("role", "barber").is("user_id", null);
  const { error: delError } = await supabase.from("members").delete().eq("salon_id", salon.id).eq("role", "barber").is("user_id", null);
  if (delError) return { error: errors.generic };

  const toSend: Array<{ name: string; email: string; chair: number; token: string }> = [];
  if (names.length > 0) {
    const rows = names.map((name, i) => {
      const chair = i + 2;
      const email = emails[i];
      if (!email) return { salon_id: salon.id, name, role: "barber" as const, chair_no: chair };
      const same = (before ?? []).find((b) => b.chair_no === chair && b.invite_email === email && b.invite_token);
      const token = same?.invite_token ?? newToken();
      if (!same) toSend.push({ name, email, chair, token });
      return { salon_id: salon.id, name, role: "barber" as const, chair_no: chair, invite_email: email, invite_token: token, invite_expires_at: same?.invite_expires_at ?? inviteExpiry() };
    });
    const { error } = await supabase.from("members").insert(rows);
    if (error) return { error: errors.generic };
  }

  const { error } = await supabase.from("salons").update({ onboarding_step: 5 }).eq("id", salon.id);
  if (error) return { error: errors.generic };
  for (const i of toSend) await sendInviteEmail({ salon: { ...salon, ownerName: membership.name }, ...i });
  redirect("/pronto");
}
