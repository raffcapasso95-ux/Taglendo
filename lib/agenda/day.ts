import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dayRange, isValidDate, romeDate, romeMinutes, weekdayOf } from "@/lib/dates/rome";
import type { AgendaAppt, DayHours, Operator } from "@/lib/rules/agenda";
import { dayFromRanges } from "@/lib/rules/hours";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type HoursRow = { closed: boolean; ranges: Array<[number, number]> };

/** Un giorno per l'agenda: da quando a quando è aperto e dove sono le pause (chiuso = 0–0 senza pause). */
export const asHours = (row: HoursRow | undefined): DayHours => {
  const day = dayFromRanges(row ?? { closed: true, ranges: [] });
  return day.closed || day.openMin == null || day.closeMin == null
    ? { closed: true, openMin: 0, closeMin: 0, breaks: [] }
    : { closed: false, openMin: day.openMin, closeMin: day.closeMin, breaks: day.breaks };
};

/** Gli orari della settimana di un salone: una riga per giorno (0 = domenica), con le fasce. */
export async function weekHours(supabase: Client, salonId: string): Promise<Map<number, HoursRow>> {
  const [days, ranges] = await Promise.all([
    supabase.from("opening_hours").select("weekday, closed").eq("salon_id", salonId),
    supabase.from("opening_ranges").select("weekday, start_min, end_min").eq("salon_id", salonId).order("start_min"),
  ]);
  const map = new Map<number, HoursRow>((days.data ?? []).map((d) => [d.weekday, { closed: d.closed, ranges: [] }]));
  for (const r of ranges.data ?? []) map.get(r.weekday)?.ranges.push([r.start_min, r.end_min]);
  return map;
}

/** Orari di apertura di un giorno, con le chiusure di tutto il salone. */
export async function hoursFor(supabase: Client, salonId: string, date: string): Promise<DayHours> {
  const [week, closures] = await Promise.all([
    weekHours(supabase, salonId),
    supabase.from("closures").select("id").eq("salon_id", salonId).is("member_id", null).lte("starts_on", date).gte("ends_on", date).limit(1),
  ]);
  if ((closures.data ?? []).length > 0) return asHours(undefined);
  return asHours(week.get(weekdayOf(date)));
}

/** I barbieri attivi del salone, in ordine di poltrona. */
export async function operatorsOf(supabase: Client, salonId: string): Promise<Operator[]> {
  const { data } = await supabase.from("members").select("id, name, chair_no").eq("salon_id", salonId).eq("active", true).order("chair_no");
  return (data ?? []).map((m) => ({ id: m.id, name: m.name, chairNo: m.chair_no }));
}

/** Gli appuntamenti di un giorno (tutti gli stati) nella forma che usa l'agenda. */
export async function appointmentsOn(supabase: Client, salonId: string, date: string): Promise<AgendaAppt[]> {
  const { start, end } = dayRange(date);
  const { data } = await supabase
    .from("appointments")
    .select("id, member_id, service_name, price_cents, starts_at, ends_at, status, source, client:clients(name)")
    .eq("salon_id", salonId)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at");
  return (data ?? []).map((a) => {
    const endAt = new Date(a.ends_at);
    return {
      id: a.id,
      memberId: a.member_id,
      clientName: a.client?.name ?? "Cliente",
      phone: null,
      serviceName: a.service_name,
      priceCents: a.price_cents,
      startMin: romeMinutes(new Date(a.starts_at)),
      // un appuntamento che passa la mezzanotte si ferma a fine giornata
      endMin: romeDate(endAt) === date ? romeMinutes(endAt) : 24 * 60,
      status: a.status,
      source: a.source,
    };
  });
}

export { isValidDate };
