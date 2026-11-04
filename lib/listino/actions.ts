"use server";

import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { listinoCopy } from "@/lib/copy/listino";
import { addDays, dayRange, isValidDate, romeDate, romeMinutes, weekdayOf } from "@/lib/dates/rome";
import { LIMITS } from "@/lib/rules/forms";
import { outsideHours, type HoursDraft } from "@/lib/rules/listino";
import { createClient } from "@/lib/supabase/server";

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

export async function saveHours(d: HoursDraft): Promise<{ ok: true; outside: number } | Failure> {
  const ctx = await owner();
  if (!ctx) return fail(errors.notOwner);
  const days = [...new Set(d.closedDays)].filter((x) => Number.isInteger(x) && x >= 0 && x <= 6);
  const pause = d.breakStart >= 0;
  const valid =
    days.length < 7 &&
    Number.isInteger(d.open) && Number.isInteger(d.close) &&
    d.open >= 360 && d.close <= 1320 && d.close - d.open >= 120 &&
    (!pause || (d.breakStart >= d.open + 30 && d.breakEnd >= d.breakStart + 15 && d.breakEnd <= d.close - 30));
  if (!valid) return fail(errors.hours);

  const { supabase, salon } = ctx;
  const rows = Array.from({ length: 7 }, (_, weekday) => {
    const closed = days.includes(weekday);
    return {
      salon_id: salon.id,
      weekday,
      closed,
      open_min: closed ? null : d.open,
      close_min: closed ? null : d.close,
      break_start_min: closed || !pause ? null : d.breakStart,
      break_end_min: closed || !pause ? null : d.breakEnd,
    };
  });
  const { error } = await supabase.from("opening_hours").upsert(rows, { onConflict: "salon_id,weekday" });
  if (error) return fail(errors.generic);

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
    { ...d, closedDays: days },
  );
  revalidatePath("/listino");
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
