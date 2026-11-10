import "server-only";
import { render } from "@react-email/render";
import { cancelEmailCopy, emailCopy, inviteEmailCopy, movedEmailCopy, reminderEmailCopy } from "@/lib/copy/emails";
import { env } from "@/lib/supabase/env";
import { CancellationEmail, type CancellationEmailProps } from "./templates/CancellationEmail";
import { CodeEmail, type CodeEmailProps } from "./templates/CodeEmail";
import { InviteEmail, type InviteEmailProps } from "./templates/InviteEmail";
import { MovedEmail, type MovedEmailProps } from "./templates/MovedEmail";
import { ReminderEmail, type ReminderEmailProps } from "./templates/ReminderEmail";
import { StaffEmail, type StaffEmailProps } from "./templates/StaffEmail";
import { ConfirmationEmail, type ConfirmationEmailProps } from "./templates/ConfirmationEmail";

type Built = { subject: string; html: string; text: string };

/** F1: il codice a 6 cifre. */
export async function buildCodeEmail(p: Omit<CodeEmailProps, "siteUrl">): Promise<Built> {
  const el = <CodeEmail {...p} siteUrl={env.siteUrl()} />;
  const spaced = `${p.code.slice(0, 3)} ${p.code.slice(3)}`;
  return { subject: emailCopy.code.subject(spaced), html: await render(el), text: await render(el, { plainText: true }) };
}

/** F2: la prenotazione confermata. `subjectWhen` è "venerdì 30 ottobre alle 10:30". */
export async function buildConfirmationEmail(p: Omit<ConfirmationEmailProps, "siteUrl"> & { subjectWhen: string }): Promise<Built> {
  const { subjectWhen, ...props } = p;
  const el = <ConfirmationEmail {...props} siteUrl={env.siteUrl()} />;
  return { subject: emailCopy.confirmed.subject(subjectWhen), html: await render(el), text: await render(el, { plainText: true }) };
}

/** F4: appuntamento annullato. */
export async function buildCancellationEmail(p: Omit<CancellationEmailProps, "siteUrl">): Promise<Built> {
  const el = <CancellationEmail {...p} siteUrl={env.siteUrl()} />;
  return { subject: cancelEmailCopy.subject, html: await render(el), text: await render(el, { plainText: true }) };
}

/** F3: promemoria. `at` è l'ora, "10:30", per l'oggetto; `dayLong` è "giovedì 12 novembre" (serve con day "altro"). */
export async function buildReminderEmail(p: Omit<ReminderEmailProps, "siteUrl"> & { at: string; dayLong?: string }): Promise<Built> {
  const { at, dayLong, ...props } = p;
  const el = <ReminderEmail {...props} siteUrl={env.siteUrl()} />;
  return { subject: reminderEmailCopy.subject(p.salonName, at, p.day, dayLong), html: await render(el), text: await render(el, { plainText: true }) };
}

/** F6: appuntamento spostato. `afterLong` è "venerdì 30 ottobre alle 11:30". */
export async function buildMovedEmail(p: Omit<MovedEmailProps, "siteUrl"> & { afterLong: string }): Promise<Built> {
  const { afterLong, ...props } = p;
  const el = <MovedEmail {...props} siteUrl={env.siteUrl()} />;
  return { subject: movedEmailCopy.subject(afterLong), html: await render(el), text: await render(el, { plainText: true }) };
}

/** F5: invito a un operatore. */
export async function buildInviteEmail(p: Omit<InviteEmailProps, "siteUrl"> & { ownerFirst: string }): Promise<Built> {
  const { ownerFirst, ...props } = p;
  const el = <InviteEmail {...props} siteUrl={env.siteUrl()} />;
  return { subject: inviteEmailCopy.subject(ownerFirst), html: await render(el), text: await render(el, { plainText: true }) };
}

/** Avvisi al barbiere. */
export async function buildStaffEmail(p: Omit<StaffEmailProps, "siteUrl"> & { subject: string }): Promise<Built> {
  const { subject, ...props } = p;
  const el = <StaffEmail {...props} siteUrl={env.siteUrl()} />;
  return { subject, html: await render(el), text: await render(el, { plainText: true }) };
}
