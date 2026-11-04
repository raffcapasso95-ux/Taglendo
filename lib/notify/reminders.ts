import "server-only";
import { addDays, dayRange, romeDate } from "@/lib/dates/rome";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailReminder } from "./clientMail";

/**
 * I promemoria del giorno dopo. Ogni appuntamento ha il suo segno (reminder_sent_at): lo si prende prima di scrivere,
 * così due passaggi insieme non mandano due email. Se l'invio fallisce il segno si toglie e si riprova al prossimo giro.
 */
export async function runReminders(now: Date): Promise<number> {
  const admin = createAdminClient();
  const { start, end } = dayRange(addDays(romeDate(now), 1));
  const { data } = await admin
    .from("appointments")
    .select("id")
    .eq("status", "confermato")
    .is("reminder_sent_at", null)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString());
  let sent = 0;
  for (const { id } of data ?? []) {
    const { data: claimed } = await admin.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", id).is("reminder_sent_at", null).select("id");
    if (!claimed?.length) continue;
    if (await emailReminder(id)) sent += 1;
    else await admin.from("appointments").update({ reminder_sent_at: null }).eq("id", id);
  }
  return sent;
}
