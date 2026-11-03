import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dayRange, isValidDate, romeDate, romeMinutes, weekdayOf } from "@/lib/dates/rome";
import type { AgendaAppt, DayHours, Operator } from "@/lib/rules/agenda";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

type HoursRow = { closed: boolean; open_min: number | null; close_min: number | null; break_start_min: number | null; break_end_min: number | null };

export const asHours = (row: HoursRow | undefined): DayHours =>
  !row || row.closed || row.open_min == null || row.close_min == null
    ? { closed: true, openMin: 0, closeMin: 0, breakStartMin: null, breakEndMin: null }
    : { closed: false, openMin: row.open_min, closeMin: row.close_min, breakStartMin: row.break_start_min, breakEndMin: row.break_end_min };

/** Orari di apertura di un giorno, con le chiusure di tutto il salone. */
export async function hoursFor(supabase: Client, salonId: string, date: string): Promise<DayHours> {
  const [hours, closures] = await Promise.all([
    supabase.from("opening_hours").select("closed, open_min, close_min, break_start_min, break_end_min").eq("salon_id", salonId).eq("weekday", weekdayOf(date)).maybeSingle(),
    supabase.from("closures").select("id").eq("salon_id", salonId).is("member_id", null).lte("starts_on", date).gte("ends_on", date).limit(1),
  ]);
  if ((closures.data ?? []).length > 0) return asHours(undefined);
  return asHours(hours.data ?? undefined);
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
