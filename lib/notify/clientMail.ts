import "server-only";
import { buildCancellationEmail, buildMovedEmail, buildReminderEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/supabase/env";
import { romeDate, romeMinutes } from "@/lib/dates/rome";
import { span } from "@/lib/rules/agenda";
import { cancelLimitText, whenLong, whenShort } from "@/lib/rules/emailText";
import { formatMinutes } from "@/lib/rules/hours";
import { footerOf, loadApptContext, type ApptContext } from "./context";

const serviceLine = (c: ApptContext) => `${c.serviceName}${c.multiple && c.memberName ? ` con ${c.memberName}` : ""}`;

/** F6: il salone ha spostato l'appuntamento. Parte se il salone non ha spento le email di conferma. */
export async function emailMoved(appointmentId: string, before: Date): Promise<boolean> {
  const c = await loadApptContext(appointmentId);
  if (!c || !c.clientEmail || !c.salon.prefs.confirmation || c.status !== "confermato") return false;
  const built = await buildMovedEmail({
    salonName: c.salon.name,
    before: whenShort(romeDate(before), romeMinutes(before)),
    after: whenShort(c.date, c.startMin),
    afterLong: whenLong(c.date, c.startMin),
    service: serviceLine(c),
    manageUrl: c.manageUrl,
    phone: c.salon.phone,
    footer: footerOf(c.salon),
  });
  const sent = await sendEmail({ to: c.clientEmail, subject: built.subject, html: built.html, text: built.text, fromName: c.salon.name });
  if (!sent.ok) console.error("invio spostamento non riuscito:", sent.error);
  return sent.ok;
}

/** F4: il salone ha annullato l'appuntamento. Parte se il salone non ha spento le email di annullamento. */
export async function emailCancelledBySalon(appointmentId: string): Promise<boolean> {
  const c = await loadApptContext(appointmentId);
  if (!c || !c.clientEmail || !c.salon.prefs.cancellation) return false;
  const built = await buildCancellationEmail({
    salonName: c.salon.name,
    by: "salone",
    when: whenLong(c.date, c.startMin),
    bookUrl: `${env.siteUrl()}/${c.salon.slug}#prenota`,
    phone: c.salon.phone,
    footer: footerOf(c.salon),
  });
  const sent = await sendEmail({ to: c.clientEmail, subject: built.subject, html: built.html, text: built.text, fromName: c.salon.name });
  if (!sent.ok) console.error("invio annullamento non riuscito:", sent.error);
  return sent.ok;
}

/** F3: il promemoria del giorno prima. */
export async function emailReminder(appointmentId: string): Promise<boolean> {
  const c = await loadApptContext(appointmentId);
  if (!c || !c.clientEmail || !c.salon.prefs.reminder || c.status !== "confermato") return false;
  const built = await buildReminderEmail({
    salonName: c.salon.name,
    firstName: (c.clientName ?? "").split(" ")[0] ?? "",
    at: formatMinutes(c.startMin),
    when: whenShort(c.date, c.startMin),
    service: `${serviceLine(c)}${c.durationMin ? ` · ${span(c.durationMin)}` : ""}`,
    manageUrl: c.manageUrl,
    cancelUntil: c.salon.cancelOnline ? cancelLimitText(c.startsAt, c.salon.cancelLimitMin) : null,
    phone: c.salon.phone,
    footer: footerOf(c.salon),
  });
  const sent = await sendEmail({ to: c.clientEmail, subject: built.subject, html: built.html, text: built.text, fromName: c.salon.name });
  if (!sent.ok) console.error("invio promemoria non riuscito:", sent.error);
  return sent.ok;
}
