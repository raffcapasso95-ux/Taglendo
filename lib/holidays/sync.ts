import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { romeDate } from "@/lib/dates/rome";
import { holidayPlan, wantedHolidayClosures, type HolidayClosure, type Patron } from "@/lib/rules/holidays";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * Mette le chiusure delle feste in linea con la scelta del salone: da oggi alla fine dell'anno prossimo.
 * Va con il client del titolare (quando sceglie) o con quello di servizio (ogni notte, per l'anno nuovo).
 */
export async function syncHolidayClosures(supabase: Client, salonId: string, now = new Date()): Promise<{ added: number; removed: number }> {
  const today = romeDate(now);
  const { data: salon } = await supabase.from("salons").select("closed_holidays, patron_day, patron_name").eq("id", salonId).maybeSingle();
  if (!salon) return { added: 0, removed: 0 };
  const patron: Patron = salon.patron_day ? { day: salon.patron_day, name: salon.patron_name } : null;
  const keys = (salon.closed_holidays ?? []).filter((k) => k !== "patrono" || patron);
  const { data: rows } = await supabase.from("closures").select("id, holiday, starts_on, note").eq("salon_id", salonId).not("holiday", "is", null).gte("starts_on", today);
  const existing: HolidayClosure[] = (rows ?? []).map((r) => ({ id: r.id, holiday: r.holiday!, startsOn: r.starts_on, note: r.note }));
  const plan = holidayPlan(existing, wantedHolidayClosures(keys, patron, today), today);

  if (plan.remove.length) await supabase.from("closures").delete().eq("salon_id", salonId).in("id", plan.remove);
  for (const r of plan.rename) await supabase.from("closures").update({ note: r.note }).eq("salon_id", salonId).eq("id", r.id);
  if (plan.add.length) {
    // una festa già presente (due salvataggi insieme) la ferma l'indice unico: va bene così
    await supabase.from("closures").insert(plan.add.map((a) => ({ salon_id: salonId, holiday: a.key, starts_on: a.date, ends_on: a.date, member_id: null, note: a.name })));
  }
  return { added: plan.add.length, removed: plan.remove.length };
}

/** Ogni notte: per i saloni con feste scelte, si preparano le chiusure che entrano nell'orizzonte. */
export async function runHolidaySync(admin: Client, now = new Date()): Promise<number> {
  const { data } = await admin.from("salons").select("id, closed_holidays").is("deleted_at", null);
  let changed = 0;
  for (const s of (data ?? []).filter((x) => x.closed_holidays.length > 0)) {
    const r = await syncHolidayClosures(admin, s.id, now);
    changed += r.added + r.removed;
  }
  return changed;
}
