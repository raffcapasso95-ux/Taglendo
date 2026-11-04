import "server-only";
import { render } from "@react-email/render";
import { emailCopy } from "@/lib/copy/emails";
import { env } from "@/lib/supabase/env";
import { CodeEmail, type CodeEmailProps } from "./templates/CodeEmail";
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
