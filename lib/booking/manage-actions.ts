"use server";

import { cancelEmailCopy } from "@/lib/copy/emails";
import { manageCopy } from "@/lib/copy/manage";
import { buildCancellationEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/send";
import { romeDate, romeMinutes } from "@/lib/dates/rome";
import { whenLong } from "@/lib/rules/emailText";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/supabase/env";

export type CancelResult = { ok: true; emailSent: boolean } | { ok: false; reason: "late" | "not_allowed" | "gone" | "error"; error: string };

/** Annulla dal link dell'email. Le regole le applica il database; qui si manda solo l'email F4. */
export async function cancelBooking(input: { slug: string; token: string }): Promise<CancelResult> {
  if (!/^[0-9a-f]{64}$/.test(input.token)) return { ok: false, reason: "gone", error: manageCopy.invalidTitle };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cancel_booking_by_token", { p_token: input.token });
  if (error || !data) return { ok: false, reason: "error", error: manageCopy.errors.generic };
  const r = data as { status: "ok" | "too_late" | "not_allowed" | "gone"; starts_at?: string; client_email?: string | null; salon_name?: string; salon_slug?: string; salon_phone?: string; salon_address?: string | null; send_email?: boolean };
  if (r.status === "too_late") return { ok: false, reason: "late", error: manageCopy.lateTitle };
  if (r.status === "not_allowed") return { ok: false, reason: "not_allowed", error: manageCopy.phoneNote };
  if (r.status !== "ok" || !r.starts_at || r.salon_slug?.toLowerCase() !== input.slug.toLowerCase()) return { ok: false, reason: "gone", error: manageCopy.invalidTitle };

  let emailSent = false;
  if (r.send_email && r.client_email) {
    const starts = new Date(r.starts_at);
    const built = await buildCancellationEmail({
      salonName: r.salon_name ?? "",
      when: whenLong(romeDate(starts), romeMinutes(starts)),
      bookUrl: `${env.siteUrl()}/${r.salon_slug}#prenota`,
      phone: r.salon_phone ?? "",
      footer: [r.salon_name, r.salon_address, r.salon_phone].filter(Boolean).join(" · "),
    });
    const sent = await sendEmail({ to: r.client_email, subject: built.subject || cancelEmailCopy.subject, html: built.html, text: built.text, fromName: r.salon_name ?? "Taglendo" });
    emailSent = sent.ok;
    if (!sent.ok) console.error("invio annullamento non riuscito:", sent.error);
  }
  return { ok: true, emailSent };
}
