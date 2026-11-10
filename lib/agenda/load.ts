import { salonLogoUrl } from "@/lib/salon/logo";
import "server-only";
import { getMembership, getUser } from "@/lib/auth/session";
import { addDays, dayNumber, dayRange, isValidDate, longDay, monthShort, monthYear, romeDate, romeMinutes, weekdayName, weekdayOf, weekdayShort } from "@/lib/dates/rome";
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
/** lastVisit: giorno (Roma) dell'ultima visita conclusa, per proporre prima i clienti recenti e distinguere gli omonimi. */
export type ClientOption = { id: string; name: string; phone: string | null; avatarColor: number | null; photoUrl: string | null; lastVisit: string | null };

export type AgendaData = {
  salonName: string;
  /** NUOVO: logo del salone (o null: si mostrano le iniziali). */
  salonLogo: string | null;
  userFirstName: string;
  userInitials: string;
  greeting: string;
  longDate: string;
  day: DayModel;
  strip: StripDay[];
  /** NUOVO: la settimana (lunedì–domenica) del giorno scelto, con mese e settimane vicine. */
  week: { days: StripDay[]; label: string; prev: string; next: string };
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
  /** NUOVO: la guida al primo accesso non è ancora stata vista (o saltata) da questo account. */
  tourSeen: boolean;
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
  const weekStart = addDays(date, -((weekdayOf(date) + 6) % 7));
  const weekEnd = addDays(weekStart, 7);
  const fromDay = weekStart < stripStart ? weekStart : stripStart;
  const toDay = weekEnd > stripEnd ? weekEnd : stripEnd;
  const { start: rangeStart } = dayRange(fromDay);
  const { start: stripEndAt } = dayRange(toDay);

  const [flags, members, hours, closures, dayAppts, stripAppts, servicesRes, clientsRes, statsRes] = await Promise.all([
    supabase.from("salons").select("barbers_see_all, barbers_edit").eq("id", salon.id).single(),
    operatorsOf(supabase, salon.id),
    weekHours(supabase, salon.id),
    supabase.from("closures").select("starts_on, ends_on, member_id").eq("salon_id", salon.id).lte("starts_on", toDay).gte("ends_on", fromDay),
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
    supabase.from("client_stats").select("client_id, last_visit_at").eq("salon_id", salon.id).not("last_visit_at", "is", null).limit(5000),
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
  const stripDay = (d: string): StripDay => {
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
  };
  const strip: StripDay[] = Array.from({ length: STRIP_DAYS }, (_, i) => stripDay(addDays(stripStart, i)));
  const week = {
    days: Array.from({ length: 7 }, (_, i) => stripDay(addDays(weekStart, i))),
    label: monthYear(date),
    prev: addDays(date, -7),
    next: addDays(date, 7),
  };

  const lastVisit = new Map((statsRes.data ?? []).flatMap((r) => (r.client_id && r.last_visit_at ? [[r.client_id, romeDate(new Date(r.last_visit_at))] as const] : [])));
  const photoUrls = await signedPhotoUrls(supabase, (clientsRes.data ?? []).map((c) => c.photo_path));
  const userFirstName = firstName(membership.name);
  return {
    salonName: salon.name,
    salonLogo: salonLogoUrl(salon.logo_path),
    userFirstName,
    userInitials: initials(membership.name),
    greeting: isToday ? `Buongiorno, ${userFirstName}` : `Agenda di ${weekdayName(date).toLowerCase()}`,
    longDate: longDay(date),
    day,
    strip,
    week,
    operators,
    selectedOperator,
    today,
    canEdit,
    salonId: salon.id,
    services: (servicesRes.data ?? []).map((x) => ({ id: x.id, name: x.name, durationMin: x.duration_min, priceCents: x.price_cents })),
    clients: (clientsRes.data ?? []).flatMap((c) => (c.id && c.name ? [{ id: c.id, name: c.name, phone: c.phone, avatarColor: c.avatar_color, photoUrl: c.photo_path ? (photoUrls.get(c.photo_path) ?? null) : null, lastVisit: lastVisit.get(c.id) ?? null }] : [])),
    savedAt: now.toISOString(),
    tourSeen: user.user_metadata?.tour_seen === true,
  };
}
