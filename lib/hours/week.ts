import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Range, WeekDay } from "@/lib/rules/hours";

type Client = SupabaseClient<Database>;

/** Gli orari della settimana di un salone: sette giorni (0 = domenica) con interruttore e fasce. */
export async function loadWeek(supabase: Client, salonId: string): Promise<WeekDay[]> {
  const [days, ranges] = await Promise.all([
    supabase.from("opening_hours").select("weekday, closed").eq("salon_id", salonId),
    supabase.from("opening_ranges").select("weekday, start_min, end_min").eq("salon_id", salonId).order("start_min"),
  ]);
  const week: WeekDay[] = Array.from({ length: 7 }, () => ({ closed: true, ranges: [] }));
  for (const d of days.data ?? []) week[d.weekday] = { closed: d.closed, ranges: [] };
  for (const r of ranges.data ?? []) week[r.weekday]!.ranges.push([r.start_min, r.end_min] as Range);
  return week;
}

/** Salva tutta la settimana insieme (funzione del database: o tutto o niente, solo il titolare). */
export async function saveWeek(supabase: Client, salonId: string, week: WeekDay[]): Promise<boolean> {
  const payload = week.map((d, weekday) => ({ weekday, closed: d.closed, ranges: d.ranges }));
  const { error } = await supabase.rpc("set_week_hours", { p_salon: salonId, p_week: payload });
  return !error;
}

/** Le settimane proprie degli operatori: chi non compare segue gli orari del salone. */
export async function loadMemberWeeks(supabase: Client, salonId: string): Promise<Record<string, WeekDay[]>> {
  const [days, ranges] = await Promise.all([
    supabase.from("member_hours").select("member_id, weekday, closed").eq("salon_id", salonId),
    supabase.from("member_ranges").select("member_id, weekday, start_min, end_min").eq("salon_id", salonId).order("start_min"),
  ]);
  const out: Record<string, WeekDay[]> = {};
  for (const d of days.data ?? []) {
    out[d.member_id] ??= Array.from({ length: 7 }, () => ({ closed: true, ranges: [] }));
    out[d.member_id]![d.weekday] = { closed: d.closed, ranges: [] };
  }
  for (const r of ranges.data ?? []) out[r.member_id]?.[r.weekday]?.ranges.push([r.start_min, r.end_min] as Range);
  return out;
}

/** Salva la settimana di un operatore, o (week null) lo riporta agli orari del salone. Solo il titolare. */
export async function saveMemberWeek(supabase: Client, salonId: string, memberId: string, week: WeekDay[] | null): Promise<boolean> {
  const payload = week ? week.map((d, weekday) => ({ weekday, closed: d.closed, ranges: d.ranges })) : null;
  const { error } = await supabase.rpc("set_member_week", { p_salon: salonId, p_member: memberId, p_week: payload });
  return !error;
}
