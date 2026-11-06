"use server";

import { requireSalon } from "@/lib/auth/session";
import { isMonthKey, monthBounds } from "@/lib/dates/calendar";
import { addDays, dayRange, romeDate, weekdayOf } from "@/lib/dates/rome";
import { createClient } from "@/lib/supabase/server";
import { weekHours } from "./day";

export type MonthMarks = {
  /** Giorni in cui il salone è chiuso (giorno della settimana a riposo o chiusura di tutto il salone). */
  closed: string[];
  /** Giorni con almeno un appuntamento (confermato o completato) che chi guarda può vedere. */
  busy: string[];
};

/** Per il calendario mensile: quali giorni del mese sono chiusi e in quali ci sono appuntamenti. */
export async function loadMonthMarks(month: string): Promise<MonthMarks> {
  if (!isMonthKey(month)) return { closed: [], busy: [] };
  const { salon } = await requireSalon();
  const supabase = await createClient();
  const { first, last } = monthBounds(month);

  const [hours, closures, appts] = await Promise.all([
    weekHours(supabase, salon.id),
    supabase.from("closures").select("starts_on, ends_on").eq("salon_id", salon.id).is("member_id", null).lte("starts_on", last).gte("ends_on", first),
    // l'accesso ai dati lo limita il database: un barbiere senza «vedere l'agenda di tutti» riceve solo i suoi
    supabase
      .from("appointments")
      .select("starts_at")
      .eq("salon_id", salon.id)
      .in("status", ["confermato", "completato"])
      .gte("starts_at", dayRange(first).start.toISOString())
      .lt("starts_at", dayRange(addDays(last, 1)).start.toISOString()),
  ]);

  const closed: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const day = hours.get(weekdayOf(d));
    const off = !day || day.closed || day.ranges.length === 0 || (closures.data ?? []).some((c) => c.starts_on <= d && d <= c.ends_on);
    if (off) closed.push(d);
  }
  const busy = [...new Set((appts.data ?? []).map((a) => romeDate(new Date(a.starts_at))))];
  return { closed, busy };
}
