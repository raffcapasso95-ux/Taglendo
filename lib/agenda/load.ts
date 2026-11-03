import "server-only";
import { getMembership, getUser } from "@/lib/auth/session";
import { addDays, dayNumber, dayRange, isValidDate, longDay, monthShort, romeDate, romeMinutes, weekdayName, weekdayOf, weekdayShort } from "@/lib/dates/rome";
import { buildDay, firstName, initials, type AgendaAppt, type DayHours, type DayModel, type Operator } from "@/lib/rules/agenda";
import { createClient } from "@/lib/supabase/server";

export type StripDay = {
  date: string;
  weekday: string;
  number: number;
  /** "nov" sotto il primo del mese */
  month: string | null;
  closed: boolean;
  hasAppointments: boolean;
  label: string;
};

export type AgendaData = {
  salonName: string;
  userFirstName: string;
  userInitials: string;
  greeting: string;
  longDate: string;
  day: DayModel;
  strip: StripDay[];
  /** Tutti i barbieri visibili a chi guarda (per il filtro e la colonna "Adesso in salone"). */
  operators: Operator[];
  selectedOperator: string | null;
  today: string;
  canEdit: boolean;
};

const STRIP_DAYS = 28;

const asHours = (row: { closed: boolean; open_min: number | null; close_min: number | null; break_start_min: number | null; break_end_min: number | null } | undefined): DayHours =>
  !row || row.closed || row.open_min == null || row.close_min == null
    ? { closed: true, openMin: 0, closeMin: 0, breakStartMin: null, breakEndMin: null }
    : { closed: false, openMin: row.open_min, closeMin: row.close_min, breakStartMin: row.break_start_min, breakEndMin: row.break_end_min };

/** Tutto ciò che serve a disegnare l'agenda di un giorno. `date` e `op` arrivano dall'indirizzo. */
export async function loadAgenda(params: { date?: string | null; op?: string | null }): Promise<AgendaData | null> {
  const membership = await getMembership();
  const user = await getUser();
  if (!membership || !user) return null;
  const { salon } = membership;
  const supabase = await createClient();

  const now = new Date();
  const today = romeDate(now);
  const date = isValidDate(params.date) ? params.date : today;
  const isToday = date === today;

  const stripStart = date < today ? date : today;
  const stripEnd = addDays(stripStart, STRIP_DAYS);
  const { start: rangeStart } = dayRange(stripStart);
  const { start: dayStart, end: dayEnd } = dayRange(date);
  const { start: stripEndAt } = dayRange(stripEnd);

  const [flags, members, hours, closures, dayAppts, stripAppts] = await Promise.all([
    supabase.from("salons").select("barbers_see_all, barbers_edit").eq("id", salon.id).single(),
    supabase.from("members").select("id, name, chair_no").eq("salon_id", salon.id).eq("active", true).order("chair_no"),
    supabase.from("opening_hours").select("weekday, closed, open_min, close_min, break_start_min, break_end_min").eq("salon_id", salon.id),
    supabase.from("closures").select("starts_on, ends_on").eq("salon_id", salon.id).is("member_id", null).lte("starts_on", stripEnd).gte("ends_on", stripStart),
    supabase
      .from("appointments")
      .select("id, member_id, service_name, price_cents, starts_at, ends_at, status, source, client:clients(name)")
      .eq("salon_id", salon.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .order("starts_at"),
    supabase
      .from("appointments")
      .select("starts_at")
      .eq("salon_id", salon.id)
      .in("status", ["confermato", "completato"])
      .gte("starts_at", rangeStart.toISOString())
      .lt("starts_at", stripEndAt.toISOString()),
  ]);

  const isOwner = membership.role === "owner";
  const canSeeAll = isOwner || (flags.data?.barbers_see_all ?? true);
  const canEdit = isOwner || (flags.data?.barbers_edit ?? true);

  const allOps: Operator[] = (members.data ?? []).map((m) => ({ id: m.id, name: m.name, chairNo: m.chair_no }));
  // Senza "vedere l'agenda di tutti" il barbiere vede solo la propria colonna (lo impone anche il database).
  const operators = canSeeAll ? allOps : allOps.filter((o) => o.id === membership.id);
  const selectedOperator = params.op && operators.some((o) => o.id === params.op) ? params.op : null;
  const shown = selectedOperator ? operators.filter((o) => o.id === selectedOperator) : operators;

  const byWeekday = new Map((hours.data ?? []).map((h) => [h.weekday, h]));
  const closedByClosure = (d: string) => (closures.data ?? []).some((c) => c.starts_on <= d && d <= c.ends_on);
  const dayHours = closedByClosure(date) ? asHours(undefined) : asHours(byWeekday.get(weekdayOf(date)));

  const appts: AgendaAppt[] = (dayAppts.data ?? []).map((a) => {
    const start = new Date(a.starts_at);
    const end = new Date(a.ends_at);
    const startMin = romeMinutes(start);
    // un appuntamento che passa la mezzanotte si ferma a fine giornata
    const endMin = romeDate(end) === date ? romeMinutes(end) : 24 * 60;
    return {
      id: a.id,
      memberId: a.member_id,
      clientName: a.client?.name ?? "Cliente",
      phone: null,
      serviceName: a.service_name,
      priceCents: a.price_cents,
      startMin,
      endMin,
      status: a.status,
      source: a.source,
    };
  });

  const day = buildDay({ date, isToday, nowMin: romeMinutes(now), hours: dayHours, operators: shown, appts });

  const withAppts = new Set((stripAppts.data ?? []).map((a) => romeDate(new Date(a.starts_at))));
  const strip: StripDay[] = Array.from({ length: STRIP_DAYS }, (_, i) => {
    const d = addDays(stripStart, i);
    const closed = closedByClosure(d) || asHours(byWeekday.get(weekdayOf(d))).closed;
    return {
      date: d,
      weekday: weekdayShort(d),
      number: dayNumber(d),
      month: dayNumber(d) === 1 ? monthShort(d) : null,
      closed,
      hasAppointments: withAppts.has(d),
      label: `${longDay(d)}${closed ? ", chiuso" : ""}`,
    };
  });

  const userFirstName = firstName(membership.name);
  return {
    salonName: salon.name,
    userFirstName,
    userInitials: initials(membership.name),
    greeting: isToday ? `Buongiorno, ${userFirstName}` : `Agenda di ${weekdayName(date).toLowerCase()}`,
    longDate: longDay(date),
    day,
    strip,
    operators,
    selectedOperator,
    today,
    canEdit,
  };
}
