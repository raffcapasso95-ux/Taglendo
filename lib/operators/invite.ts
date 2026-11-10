import "server-only";
import { randomBytes } from "node:crypto";
import { buildInviteEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/supabase/env";

export type InviteMail = { salon: { name: string; address: string | null; phone: string | null; ownerName: string }; name: string; email: string; chair: number; token: string };

/** F5: l'email con il link d'invito. Se non parte, il titolare ha comunque il link da mandare a mano. */
export async function sendInviteEmail(i: InviteMail): Promise<void> {
  try {
    const built = await buildInviteEmail({
      salonName: i.salon.name,
      name: i.name.split(" ")[0] ?? i.name,
      ownerFirst: i.salon.ownerName.split(" ")[0] ?? i.salon.ownerName,
      ownerFull: i.salon.ownerName,
      chair: i.chair,
      acceptUrl: linkFor(i.token),
      footer: [i.salon.name, i.salon.address, i.salon.phone].filter(Boolean).join(" · "),
    });
    const sent = await sendEmail({ to: i.email, subject: built.subject, html: built.html, text: built.text, fromName: i.salon.name });
    if (!sent.ok) console.error("invio invito non riuscito:", sent.error);
  } catch (e) {
    console.error("invio invito non riuscito:", e);
  }
}

export const newToken = () => randomBytes(24).toString("base64url");
export const linkFor = (token: string) => `${env.siteUrl()}/invito/${token}`;
