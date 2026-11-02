"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { operatorsCopy } from "@/lib/copy/operators";
import { isEmail, isPersonName, LIMITS } from "@/lib/rules/forms";
import { inviteExpiry } from "@/lib/rules/invite";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";

const { errors } = operatorsCopy;

export type InviteResult = { error?: string; field?: "name" | "email"; link?: string; name?: string };

async function ownerSalon() {
  const m = await requireSalon();
  return m.role === "owner" ? m.salon : null;
}

const newToken = () => randomBytes(24).toString("base64url");
const linkFor = (token: string) => `${env.siteUrl()}/invito/${token}`;
const expiry = () => inviteExpiry();

/**
 * Crea (o rinnova) un invito. Con `memberId` invita una poltrona già esistente
 * (le poltrone del primo avvio); senza, aggiunge un nuovo barbiere sulla prima poltrona libera.
 * Restituisce il link da mandare: l'email d'invito parte con le email del salone (Fase 5).
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

  if (memberId) {
    const { data: rows, error } = await supabase
      .from("members")
      .update(invite)
      .eq("id", memberId)
      .eq("salon_id", salon.id)
      .is("user_id", null)
      .select("id");
    if (error || !rows || rows.length === 0) return { error: errors.generic };
  } else {
    const { data: taken } = await supabase.from("members").select("chair_no").eq("salon_id", salon.id);
    const used = new Set((taken ?? []).map((m) => m.chair_no));
    const chair = [1, 2, 3].find((n) => !used.has(n));
    if (!chair) return { error: errors.full };
    const { error } = await supabase
      .from("members")
      .insert({ salon_id: salon.id, role: "barber", chair_no: chair, ...invite });
    if (error) return { error: errors.generic };
  }

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
    .select("id, name");
  if (error || !rows || rows.length === 0) return { error: errors.generic };
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
