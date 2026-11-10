import "server-only";
import { buildCancellationEmail, buildConfirmationEmail, buildMovedEmail, buildReminderEmail } from "@/lib/email/render";
import { formatPrice } from "@/lib/dates/format";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/supabase/env";
import { addDays, longDay, romeDate, romeMinutes, weekdayName } from "@/lib/dates/rome";
import { reminderDayWord } from "@/lib/rules/reminders";
import { span } from "@/lib/rules/agenda";
import { cancelLimitText, whenLong, whenShort } from "@/lib/rules/emailText";
import { formatMinutes } from "@/lib/rules/hours";
import { footerOf, loadApptContext, type ApptContext } from "./context";

const serviceLine = (c: ApptContext) => `${c.serviceName}${c.multiple && c.memberName ? ` con ${c.memberName}` : ""}`;

/**
 * F2 anche per gli appuntamenti fissati dal salone in agenda: parte se il cliente ha un'email
 * e il salone non ha spento le email di conferma. Le prenotazioni online la mandano già da sé.
 */
export async function emailConfirmedBySalon(appointmentId: string): Promise<boolean> {
  const c = await loadApptContext(appointmentId);
  if (!c || !c.clientEmail || !c.salon.prefs.confirmation || c.status !== "confermato") return false;
  const built = await buildConfirmationEmail({
    salonName: c.salon.name,
    firstName: (c.clientName ?? "").split(" ")[0] ?? "",
    weekday: weekdayName(c.date).toLowerCase(),
    when: whenShort(c.date, c.startMin),
    subjectWhen: whenLong(c.date, c.startMin),
    service: `${c.serviceName}${c.durationMin ? ` · ${span(c.durationMin)}` : ""}`,
    barber: c.multiple && c.memberName ? c.memberName : null,
    price: c.salon.showPrices ? formatPrice(c.priceCents) : null,
    address: c.salon.address,
    manageUrl: c.manageUrl,
    calendarUrl: `${c.manageUrl}/calendario.ics`,
    cancelUntil: c.salon.cancelOnline ? cancelLimitText(c.startsAt, c.salon.cancelLimitMin) : null,
    phone: c.salon.phone,
    footer: footerOf(c.salon),
  });
  const sent = await sendEmail({ to: c.clientEmail, subject: built.subject, html: built.html, text: built.text, fromName: c.salon.name });
  if (!sent.ok) console.error("invio conferma non riuscito:", sent.error);
  return sent.ok;
}

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
  const today = romeDate(new Date());
  const built = await buildReminderEmail({
    salonName: c.salon.name,
    firstName: (c.clientName ?? "").split(" ")[0] ?? "",
    day: reminderDayWord(c.date, today, addDays(today, 1)),
    weekday: weekdayName(c.date).toLowerCase(),
    dayLong: longDay(c.date).toLowerCase(),
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
