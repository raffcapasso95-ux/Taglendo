"use server";

import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { listinoCopy } from "@/lib/copy/listino";
import { addDays, dayRange, isValidDate, romeDate, romeMinutes, weekdayOf } from "@/lib/dates/rome";
import { LIMITS } from "@/lib/rules/forms";
import { saveWeek } from "@/lib/hours/week";
import { validateRanges, type Range, type WeekDay } from "@/lib/rules/hours";
import { canSaveWeek, outsideHours } from "@/lib/rules/listino";
import { createClient } from "@/lib/supabase/server";
import { syncHolidayClosures } from "@/lib/holidays/sync";
import { isHolidayKey, isPatronDay, upcomingHolidays } from "@/lib/rules/holidays";

const { errors } = listinoCopy;

export type Failure = { ok: false; error: string };
const fail = (error: string): Failure => ({ ok: false, error });

async function owner() {
  const m = await requireSalon();
  return m.role === "owner" ? { salon: m.salon, supabase: await createClient() } : null;
}

/* ───────────── Servizi ───────────── */

export type ServiceInput = { id?: string | null; name: string; durationMin: number; priceCents: number };

export async function saveService(input: ServiceInput): Promise<{ ok: true; created: boolean } | Failure> {
  const ctx = await owner();
  if (!ctx) return fail(errors.notOwner);
  const name = input.name.trim();
  if (!name || name.length > LIMITS.serviceName) return fail(errors.name);
  if (!Number.isInteger(input.durationMin) || input.durationMin < 5 || input.durationMin > 240) return fail(errors.duration);
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 999_900) return fail(errors.price);

  const { supabase, salon } = ctx;
  if (input.id) {
    const { data, error } = await supabase
      .from("services")
      .update({ name, duration_min: input.durationMin, price_cents: input.priceCents })
      .eq("id", input.id)
      .eq("salon_id", salon.id)
      .select("id");
    if (error || !data?.length) return fail(errors.generic);
  } else {
    const { data: last } = await supabase.from("services").select("sort").eq("salon_id", salon.id).order("sort", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase
      .from("services")
      .insert({ salon_id: salon.id, name, duration_min: input.durationMin, price_cents: input.priceCents, sort: (last?.sort ?? 0) + 1 });
    if (error) return fail(errors.generic);
  }
  revalidatePath("/listino");
  return { ok: true, created: !input.id };
}

/** Toglie un servizio dal listino senza cancellarlo: gli appuntamenti già fissati restano invariati. */
export async function removeService(id: string): Promise<{ ok: true } | Failure> {
  const ctx = await owner();
  if (!ctx) return fail(errors.notOwner);
  const { error } = await ctx.supabase.from("services").update({ active: false }).eq("id", id).eq("salon_id", ctx.salon.id);
  if (error) return fail(errors.generic);
  revalidatePath("/listino");
  return { ok: true };
}

/* ───────────── Orari ───────────── */

/** Salva gli orari di tutta la settimana: ogni giorno con le sue fasce. Dice anche quanti appuntamenti futuri restano fuori orario. */
export async function saveWeekHours(week: WeekDay[]): Promise<{ ok: true; outside: number } | Failure> {
  const ctx = await owner();
  if (!ctx) return fail(errors.notOwner);
  if (!Array.isArray(week) || week.length !== 7) return fail(errors.hours);
  const clean: WeekDay[] = week.map((d) => ({ closed: Boolean(d.closed), ranges: (d.ranges ?? []).map(([a, b]): Range => [Math.trunc(a), Math.trunc(b)]) }));
  // un giorno aperto ha fasce valide; uno chiuso può tenerle (si ritrovano riaprendolo) ma devono essere valide lo stesso
  for (const d of clean) {
    if (d.ranges.length > 0 && validateRanges(d.ranges)) return fail(errors.hours);
    if (!d.closed && d.ranges.length === 0) return fail(errors.hours);
  }
  if (!canSaveWeek(clean)) return fail(errors.hours);

  const { supabase, salon } = ctx;
  if (!(await saveWeek(supabase, salon.id, clean))) return fail(errors.generic);

  // Gli appuntamenti futuri confermati che restano fuori dal nuovo orario: li segnaliamo, non li tocchiamo.
  const { data: future } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("salon_id", salon.id)
    .eq("status", "confermato")
    .gte("starts_at", new Date().toISOString())
    .limit(2000);
  const outside = outsideHours(
    (future ?? []).map((a) => {
      const start = new Date(a.starts_at);
      const end = new Date(a.ends_at);
      return {
        weekday: weekdayOf(romeDate(start)),
        startMin: romeMinutes(start),
        endMin: romeDate(end) === romeDate(start) ? romeMinutes(end) : 1440,
      };
    }),
    clean,
  );
  revalidatePath("/listino");
  revalidatePath("/listino/orari");
  revalidatePath("/agenda");
  return { ok: true, outside };
}

/* ───────────── Chiusure ───────────── */

export type ClosureInput = { id?: string | null; startsOn: string; endsOn: string; memberId: string | null; note: string };

export type Impacted = { id: string; clientName: string; phone: string | null; date: string; startMin: number; memberName: string };

/** Gli appuntamenti confermati che cadono in una chiusura (di tutto il salone o di un solo barbiere). */
export async function closureImpact(input: { startsOn: string; endsOn: string; memberId: string | null }): Promise<Impacted[]> {
  const ctx = await owner();
  if (!ctx || !isValidDate(input.startsOn) || !isValidDate(input.endsOn) || input.endsOn < input.startsOn) return [];
  const { supabase, salon } = ctx;
  let query = supabase
    .from("appointments")
    .select("id, member_id, client_id, starts_at, status, member:members(name), client:clients(name)")
    .eq("salon_id", salon.id)
    .eq("status", "confermato")
    .gte("starts_at", dayRange(input.startsOn).start.toISOString())
    .lt("starts_at", dayRange(addDays(input.endsOn, 1)).start.toISOString())
    .gte("starts_at", new Date().toISOString())
    .order("starts_at");
  if (input.memberId) query = query.eq("member_id", input.memberId);
  const { data } = await query;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.client_id).filter((x): x is string => Boolean(x)))];
  const phones = new Map<string, string | null>();
  if (ids.length) {
    const { data: visible } = await supabase.from("clients_visible").select("id, phone").in("id", ids);
    for (const c of visible ?? []) if (c.id) phones.set(c.id, c.phone);
  }
  return rows.map((r) => ({
    id: r.id,
    clientName: r.client?.name ?? "Cliente",
    phone: r.client_id ? (phones.get(r.client_id) ?? null) : null,
    date: romeDate(new Date(r.starts_at)),
    startMin: romeMinutes(new Date(r.starts_at)),
    memberName: r.member?.name ?? "",
  }));
}

export async function saveClosure(input: ClosureInput): Promise<{ ok: true; impacted: Impacted[] } | Failure> {
  const ctx = await owner();
  if (!ctx) return fail(errors.notOwner);
  if (!isValidDate(input.startsOn) || !isValidDate(input.endsOn) || input.endsOn < input.startsOn) return fail(errors.dates);
  const note = input.note.trim().slice(0, 500) || null;
  const { supabase, salon } = ctx;

  const values = { starts_on: input.startsOn, ends_on: input.endsOn, member_id: input.memberId, note };
  if (input.id) {
    const { data, error } = await supabase.from("closures").update(values).eq("id", input.id).eq("salon_id", salon.id).select("id");
    if (error || !data?.length) return fail(errors.generic);
  } else {
    const { error } = await supabase.from("closures").insert({ salon_id: salon.id, ...values });
    if (error) return fail(errors.generic);
  }
  revalidatePath("/listino/chiusure");
  revalidatePath("/agenda");
  return { ok: true, impacted: await closureImpact(input) };
}

export async function deleteClosure(id: string): Promise<{ ok: true } | Failure> {
  const ctx = await owner();
  if (!ctx) return fail(errors.notOwner);
  const { error } = await ctx.supabase.from("closures").delete().eq("id", id).eq("salon_id", ctx.salon.id);
  if (error) return fail(errors.generic);
  revalidatePath("/listino/chiusure");
  revalidatePath("/agenda");
  return { ok: true };
}

/* ───────────── Festività ───────────── */

/** Accende o spegne «Chiuso» per una festa: vale ogni anno. Se si chiude, gli appuntamenti già presenti in quel giorno. */
export async function setHolidayClosed(key: string, closed: boolean): Promise<{ ok: true; impacted: Impacted[] } | Failure> {
  const ctx = await owner();
  if (!ctx) return fail(errors.notOwner);
  if (!isHolidayKey(key)) return fail(errors.generic);
  const { supabase, salon } = ctx;
  const { data: current } = await supabase.from("salons").select("closed_holidays, patron_day, patron_name").eq("id", salon.id).maybeSingle();
  if (!current) return fail(errors.generic);
  const set = new Set(current.closed_holidays ?? []);
  if (closed) set.add(key);
  else set.delete(key);
  const { error } = await supabase.from("salons").update({ closed_holidays: [...set] }).eq("id", salon.id);
  if (error) return fail(errors.generic);
  await syncHolidayClosures(supabase, salon.id);
  revalidatePath("/listino/chiusure");
  revalidatePath("/agenda");
  if (!closed) return { ok: true, impacted: [] };
  const patron = current.patron_day ? { day: current.patron_day, name: current.patron_name } : null;
  const next = upcomingHolidays(romeDate(new Date()), patron).find((h) => h.key === key);
  return { ok: true, impacted: next ? await closureImpact({ startsOn: next.date, endsOn: next.date, memberId: null }) : [] };
}

/** Il santo patrono della città: giorno («MM-GG») e nome. Con `day` null si toglie (e le sue chiusure con lui). */
export async function savePatron(input: { day: string | null; name: string }): Promise<{ ok: true } | Failure> {
  const ctx = await owner();
  if (!ctx) return fail(errors.notOwner);
  if (input.day !== null && !isPatronDay(input.day)) return fail(errors.dates);
  const name = input.name.trim().slice(0, 60) || null;
  const { supabase, salon } = ctx;
  const { data: current } = await supabase.from("salons").select("closed_holidays").eq("id", salon.id).maybeSingle();
  const set = new Set(current?.closed_holidays ?? []);
  // un patrono nuovo parte già «chiuso» (si aggiunge per questo); tolto il patrono, sparisce anche la scelta
  if (input.day) set.add("patrono");
  else set.delete("patrono");
  const { error } = await supabase
    .from("salons")
    .update({ patron_day: input.day, patron_name: input.day ? name : null, closed_holidays: [...set] })
    .eq("id", salon.id);
  if (error) return fail(errors.generic);
  await syncHolidayClosures(supabase, salon.id);
  revalidatePath("/listino/chiusure");
  revalidatePath("/agenda");
  return { ok: true };
}
