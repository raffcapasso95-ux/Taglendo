import "server-only";
import { requireSalon } from "@/lib/auth/session";
import { romeDate, weekdayOf } from "@/lib/dates/rome";
import { splitClosures, type ClosureRow } from "@/lib/rules/closures";
import { upcomingHolidays, type HolidayDay, type HolidayKey } from "@/lib/rules/holidays";
import { createClient } from "@/lib/supabase/server";

export type ClosureItem = ClosureRow & { memberName: string | null };

/** Una festa nell'elenco «Festività»: il prossimo giorno in cui cade e se il salone è chiuso. */
export type HolidayItem = HolidayDay & { closed: boolean; weeklyClosed: boolean };

/** Le chiusure del salone, divise in programma e passate, con i barbieri per sceglierne uno, e le festività. */
export async function loadClosures() {
  const { role, salon } = await requireSalon();
  const supabase = await createClient();
  const [closures, members, settings, hours] = await Promise.all([
    supabase.from("closures").select("id, starts_on, ends_on, member_id, note").eq("salon_id", salon.id).is("holiday", null),
    supabase.from("members").select("id, name").eq("salon_id", salon.id).eq("active", true).order("chair_no"),
    supabase.from("salons").select("closed_holidays, patron_day, patron_name").eq("id", salon.id).maybeSingle(),
    supabase.from("opening_hours").select("weekday, closed").eq("salon_id", salon.id),
  ]);
  const names = new Map((members.data ?? []).map((m) => [m.id, m.name]));
  const rows: ClosureItem[] = (closures.data ?? []).map((c) => ({
    id: c.id,
    startsOn: c.starts_on,
    endsOn: c.ends_on,
    memberId: c.member_id,
    note: c.note,
    memberName: c.member_id ? (names.get(c.member_id) ?? null) : null,
  }));
  const today = romeDate(new Date());
  const s = settings.data;
  const patron = s?.patron_day ? { day: s.patron_day, name: s.patron_name } : null;
  const closedSet = new Set<string>(s?.closed_holidays ?? []);
  const weeklyClosed = new Set((hours.data ?? []).filter((h) => h.closed).map((h) => h.weekday));
  const holidays: HolidayItem[] = upcomingHolidays(today, patron).map((h) => ({
    ...h,
    closed: closedSet.has(h.key as HolidayKey),
    weeklyClosed: weeklyClosed.has(weekdayOf(h.date)),
  }));
  return {
    canEdit: role === "owner",
    today,
    year: Number(today.slice(0, 4)),
    ...splitClosures(rows, today),
    operators: (members.data ?? []).map((m) => ({ id: m.id, name: m.name })),
    holidays,
    patron,
  };
}
