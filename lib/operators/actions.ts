"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { operatorsCopy } from "@/lib/copy/operators";
import { isEmail, isPersonName, LIMITS } from "@/lib/rules/forms";
import { buildInviteEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/send";
import { inviteExpiry } from "@/lib/rules/invite";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";

const { errors } = operatorsCopy;

export type InviteResult = { error?: string; field?: "name" | "email"; link?: string; name?: string };

async function ownerSalon() {
  const m = await requireSalon();
  return m.role === "owner" ? { ...m.salon, ownerName: m.name } : null;
}

type InviteMail = { salon: { name: string; address: string | null; phone: string | null; ownerName: string }; name: string; email: string; chair: number; token: string };

/** F5: l'email con il link d'invito. Se non parte, il titolare ha comunque il link da mandare a mano. */
async function sendInviteEmail(i: InviteMail): Promise<void> {
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

const newToken = () => randomBytes(24).toString("base64url");
const linkFor = (token: string) => `${env.siteUrl()}/invito/${token}`;
const expiry = () => inviteExpiry();

/**
 * Crea (o rinnova) un invito. Con `memberId` invita una poltrona già esistente
 * (le poltrone del primo avvio); senza, aggiunge un nuovo barbiere sulla prima poltrona libera.
 * Manda l'email d'invito (F5) e restituisce anche il link, da mandare a mano se serve.
 */
export async function inviteMember(_prev: InviteResult, data: FormData): Promise<InviteResult> {
  const salon = await ownerSalon();
  if (!salon) return { error: errors.notOwner };

  const memberId = String(data.get("memberId") ?? "");
  const name = String(data.get("name") ?? "").trim();
  const email = String(data.get("email") ?? "").trim().toLowerCase();

  if (!isPersonName(name, LIMITS.memberName)) return { field: "name", error: errors.name };
  if (!isEmail(email)) return { field: "email", error: errors.email };

  const supabase = await createClient();
  const token = newToken();
  const invite = { name, invite_email: email, invite_token: token, invite_expires_at: expiry() };
  let chairNo = 1;

  if (memberId) {
    const { data: rows, error } = await supabase
      .from("members")
      .update(invite)
      .eq("id", memberId)
      .eq("salon_id", salon.id)
      .is("user_id", null)
      .select("id, chair_no");
    if (error || !rows || rows.length === 0) return { error: errors.generic };
    chairNo = rows[0]!.chair_no;
  } else {
    const { data: taken } = await supabase.from("members").select("chair_no").eq("salon_id", salon.id);
    const used = new Set((taken ?? []).map((m) => m.chair_no));
    const chair = [1, 2, 3].find((n) => !used.has(n));
    if (!chair) return { error: errors.full };
    const { error } = await supabase
      .from("members")
      .insert({ salon_id: salon.id, role: "barber", chair_no: chair, ...invite });
    if (error) return { error: errors.generic };
    chairNo = chair;
  }

  await sendInviteEmail({ salon, name, email, chair: chairNo, token });
  revalidatePath("/impostazioni/operatori");
  return { link: linkFor(token), name };
}

/** Annulla un invito in sospeso: il link smette di funzionare. */
export async function revokeInvite(memberId: string): Promise<{ error?: string }> {
  const salon = await ownerSalon();
  if (!salon) return { error: errors.notOwner };
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ invite_token: null, invite_expires_at: null, invite_email: null })
    .eq("id", memberId)
    .eq("salon_id", salon.id)
    .is("user_id", null);
  if (error) return { error: errors.generic };
  revalidatePath("/impostazioni/operatori");
  return {};
}

/** "Invia di nuovo": nuovo link e altri 7 giorni, con la stessa email. */
export async function renewInvite(memberId: string): Promise<InviteResult> {
  const salon = await ownerSalon();
  if (!salon) return { error: errors.notOwner };
  const supabase = await createClient();
  const token = newToken();
  const { data: rows, error } = await supabase
    .from("members")
    .update({ invite_token: token, invite_expires_at: expiry() })
    .eq("id", memberId)
    .eq("salon_id", salon.id)
    .is("user_id", null)
    .not("invite_email", "is", null)
    .select("id, name, chair_no, invite_email");
  if (error || !rows || rows.length === 0) return { error: errors.generic };
  await sendInviteEmail({ salon, name: rows[0]!.name, email: rows[0]!.invite_email!, chair: rows[0]!.chair_no, token });
  revalidatePath("/impostazioni/operatori");
  return { link: linkFor(token), name: rows[0]!.name };
}

const PERMISSIONS = ["seeAll", "edit", "contacts"] as const;
export type BarberPermission = (typeof PERMISSIONS)[number];

/** I tre interruttori di "Cosa possono fare i barbieri". Li impone il database (RLS). */
export async function setBarberPermission(
  permission: BarberPermission,
  value: boolean,
): Promise<{ error?: string }> {
  const salon = await ownerSalon();
  if (!salon) return { error: errors.notOwner };
  if (!PERMISSIONS.includes(permission)) return { error: errors.generic };
  const change =
    permission === "seeAll"
      ? { barbers_see_all: value }
      : permission === "edit"
        ? { barbers_edit: value }
        : { barbers_contacts: value };
  const supabase = await createClient();
  const { error } = await supabase.from("salons").update(change).eq("id", salon.id);
  if (error) return { error: errors.generic };
  revalidatePath("/impostazioni/operatori");
  return {};
}
