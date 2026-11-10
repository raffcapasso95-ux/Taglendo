import "server-only";
import { DEFAULT_REMINDER_HOURS, REMINDER_HOURS, reminderDue } from "@/lib/rules/reminders";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailReminder } from "./clientMail";

const MAX_HOURS = Math.max(...REMINDER_HOURS);

/**
 * I promemoria ai clienti, ognuno con l'anticipo scelto dal salone (2, 4, 12, 24 o 48 ore). Gira ogni ora.
 * Ogni appuntamento ha il suo segno (reminder_sent_at): lo si prende prima di scrivere, così due passaggi insieme
 * non mandano due email. Se l'invio fallisce il segno si toglie e si riprova al prossimo giro.
 */
export async function runReminders(now: Date): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("appointments")
    .select("id, salon_id, starts_at, created_at")
    .eq("status", "confermato")
    .is("reminder_sent_at", null)
    .gt("starts_at", now.toISOString())
    .lte("starts_at", new Date(now.getTime() + MAX_HOURS * 3_600_000).toISOString());
  const appts = data ?? [];
  if (appts.length === 0) return 0;

  const salonIds = [...new Set(appts.map((a) => a.salon_id))];
  const { data: prefs } = await admin.from("email_prefs").select("salon_id, reminder, reminder_hours").in("salon_id", salonIds);
  const bySalon = new Map((prefs ?? []).map((p) => [p.salon_id, p]));

  let sent = 0;
  for (const a of appts) {
    const p = bySalon.get(a.salon_id);
    if (p && !p.reminder) continue;
    const hours = p?.reminder_hours ?? DEFAULT_REMINDER_HOURS;
    if (!reminderDue({ startsAt: new Date(a.starts_at), createdAt: new Date(a.created_at), hours, now })) continue;
    const { data: claimed } = await admin.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", a.id).is("reminder_sent_at", null).select("id");
    if (!claimed?.length) continue;
    if (await emailReminder(a.id)) sent += 1;
    else await admin.from("appointments").update({ reminder_sent_at: null }).eq("id", a.id);
  }
  return sent;
}
