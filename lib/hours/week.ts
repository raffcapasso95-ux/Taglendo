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
