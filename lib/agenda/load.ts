import "server-only";
import { getMembership, getUser } from "@/lib/auth/session";
import { addDays, dayNumber, dayRange, isValidDate, longDay, monthShort, romeDate, romeMinutes, weekdayName, weekdayOf, weekdayShort } from "@/lib/dates/rome";
import { buildDay, firstName, initials, type AgendaAppt, type DayModel, type Operator } from "@/lib/rules/agenda";
import { signedPhotoUrls } from "@/lib/clients/photoUrls";
import { createClient } from "@/lib/supabase/server";
import { appointmentsOn, asHours, operatorsOf, weekHours } from "./day";

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

export type ServiceOption = { id: string; name: string; durationMin: number; priceCents: number };
export type ClientOption = { id: string; name: string; phone: string | null; avatarColor: number | null; photoUrl: string | null };

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
  salonId: string;
  services: ServiceOption[];
  /** Rubrica per cercare il cliente; il telefono c'è solo se chi guarda può vederlo. */
  clients: ClientOption[];
  /** Quando è stata disegnata questa agenda: la "salvata alle…" della barra offline. */
  savedAt: string;
};

const STRIP_DAYS = 28;

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
  const { start: stripEndAt } = dayRange(stripEnd);

  const [flags, members, hours, closures, dayAppts, stripAppts, servicesRes, clientsRes] = await Promise.all([
    supabase.from("salons").select("barbers_see_all, barbers_edit").eq("id", salon.id).single(),
    operatorsOf(supabase, salon.id),
    weekHours(supabase, salon.id),
    supabase.from("closures").select("starts_on, ends_on, member_id").eq("salon_id", salon.id).lte("starts_on", stripEnd).gte("ends_on", stripStart),
    appointmentsOn(supabase, salon.id, date),
    supabase
      .from("appointments")
      .select("starts_at")
      .eq("salon_id", salon.id)
      .in("status", ["confermato", "completato"])
      .gte("starts_at", rangeStart.toISOString())
      .lt("starts_at", stripEndAt.toISOString()),
    supabase.from("services").select("id, name, duration_min, price_cents").eq("salon_id", salon.id).eq("active", true).order("sort"),
    supabase.from("clients_visible").select("id, name, phone, avatar_color, photo_path").eq("salon_id", salon.id).order("name").limit(2000),
  ]);

  const isOwner = membership.role === "owner";
  const canSeeAll = isOwner || (flags.data?.barbers_see_all ?? true);
  const canEdit = isOwner || (flags.data?.barbers_edit ?? true);

  const allOps: Operator[] = members;
  // Senza "vedere l'agenda di tutti" il barbiere vede solo la propria colonna (lo impone anche il database).
  const operators = canSeeAll ? allOps : allOps.filter((o) => o.id === membership.id);
  const selectedOperator = params.op && operators.some((o) => o.id === params.op) ? params.op : null;

  const byWeekday = hours;
  const closedByClosure = (d: string) => (closures.data ?? []).some((c) => c.member_id === null && c.starts_on <= d && d <= c.ends_on);
  const offToday = new Set((closures.data ?? []).filter((c) => c.member_id !== null && c.starts_on <= date && date <= c.ends_on).map((c) => c.member_id));
  const shown = (selectedOperator ? operators.filter((o) => o.id === selectedOperator) : operators).map((o) => (offToday.has(o.id) ? { ...o, off: true } : o));
  const dayHours = closedByClosure(date) ? asHours(undefined) : asHours(byWeekday.get(weekdayOf(date)));

  const appts: AgendaAppt[] = dayAppts;

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

  const photoUrls = await signedPhotoUrls(supabase, (clientsRes.data ?? []).map((c) => c.photo_path));
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
    salonId: salon.id,
    services: (servicesRes.data ?? []).map((x) => ({ id: x.id, name: x.name, durationMin: x.duration_min, priceCents: x.price_cents })),
    clients: (clientsRes.data ?? []).flatMap((c) => (c.id && c.name ? [{ id: c.id, name: c.name, phone: c.phone, avatarColor: c.avatar_color, photoUrl: c.photo_path ? (photoUrls.get(c.photo_path) ?? null) : null }] : [])),
    savedAt: now.toISOString(),
  };
}
