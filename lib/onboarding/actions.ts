"use server";

import { redirect } from "next/navigation";
import { requireSalon } from "@/lib/auth/session";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { isPhone, LIMITS } from "@/lib/rules/forms";
import { parseTime, toWeek, validateHours, type HoursError } from "@/lib/rules/hours";
import { isValidSlug, slugify } from "@/lib/rules/slug";
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

type HoursPayload = { days: number[]; open: string; close: string; breakOn: boolean; breakStart: string; breakEnd: string };

export async function saveHours(_prev: StepState, data: FormData): Promise<StepState> {
  const { salon } = await owner();
  const p = payload<HoursPayload>(data);
  if (!p) return { error: errors.generic };

  const days = (p.days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const openMin = parseTime(p.open);
  const closeMin = parseTime(p.close);
  if (openMin == null) return { field: "open", error: errors.time };
  if (closeMin == null) return { field: "close", error: errors.time };
  let breakMin: { start: number; end: number } | null = null;
  if (p.breakOn) {
    const start = parseTime(p.breakStart);
    const end = parseTime(p.breakEnd);
    if (start == null) return { field: "breakStart", error: errors.time };
    if (end == null) return { field: "breakEnd", error: errors.time };
    breakMin = { start, end };
  }

  const invalid = validateHours({ days, openMin, closeMin, breakMin });
  if (invalid) {
    const field = invalid === "no_days" ? "days" : invalid === "open_after_close" ? "open" : "breakStart";
    return { field, error: HOURS_ERRORS[invalid] };
  }

  const supabase = await createClient();
  const rows = toWeek({ days, openMin, closeMin, breakMin }).map((d, weekday) => ({
    salon_id: salon.id,
    weekday,
    closed: d.closed,
    open_min: d.openMin,
    close_min: d.closeMin,
    break_start_min: d.breakStartMin,
    break_end_min: d.breakEndMin,
  }));
  const { error } = await supabase.from("opening_hours").upsert(rows, { onConflict: "salon_id,weekday" });
  if (error) return { error: errors.generic };
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
  if (await advanceTo(salon.id, salon.onboarding_step, 4)) return { error: errors.generic };
  redirect("/primo-avvio/4");
}

/* ───────────── Passo 4 · poltrone ───────────── */

type ChairsPayload = { chairs: number; names: string[] };

export async function saveChairs(_prev: StepState, data: FormData): Promise<StepState> {
  const { salon } = await owner();
  const p = payload<ChairsPayload>(data);
  if (!p || ![1, 2, 3].includes(p.chairs)) return { error: errors.generic };

  const names = (p.names ?? []).slice(0, p.chairs - 1).map((n) => String(n ?? "").trim());
  if (names.length < p.chairs - 1 || names.some((n) => !n || n.length > LIMITS.memberName)) {
    return { field: "names", error: errors.barberName };
  }

  const supabase = await createClient();
  // Barbieri senza account e senza invito: si riscrivono. Gli inviti si mandano dopo.
  const { error: delError } = await supabase
    .from("members")
    .delete()
    .eq("salon_id", salon.id)
    .eq("role", "barber")
    .is("user_id", null);
  if (delError) return { error: errors.generic };

  if (names.length > 0) {
    const { error } = await supabase
      .from("members")
      .insert(names.map((name, i) => ({ salon_id: salon.id, name, role: "barber" as const, chair_no: i + 2 })));
    if (error) return { error: errors.generic };
  }

  const { error } = await supabase.from("salons").update({ onboarding_step: 5 }).eq("id", salon.id);
  if (error) return { error: errors.generic };
  redirect("/pronto");
}
