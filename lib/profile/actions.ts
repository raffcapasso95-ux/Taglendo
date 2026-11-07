"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSalon, requireUser } from "@/lib/auth/session";
import { profileCopy } from "@/lib/copy/profile";
import { isCode, isEmail, isPersonName, isPhone, normalizeCode } from "@/lib/rules/forms";
import { PASSWORD_MIN_LENGTH } from "@/lib/rules/password";
import { isDeleteConfirmed } from "@/lib/rules/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const { errors } = profileCopy;
export type ProfileResult = { ok: true } | { ok: false; error: string; field?: "name" | "email" | "phone" | "code" | "password" | "repeat" };

const limited = (e: { code?: string; status?: number }) =>
  e.status === 429 || e.code === "over_email_send_rate_limit" || e.code === "over_request_rate_limit";

/** Il nome della persona: sta nell'account e su ogni suo posto nei saloni (l'agenda lo mostra). */
export async function saveName(name: string): Promise<ProfileResult> {
  const user = await requireUser();
  const clean = String(name ?? "").trim().replace(/\s+/g, " ");
  if (!isPersonName(clean, 40)) return { ok: false, field: "name", error: errors.name };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { name: clean } });
  if (error) return { ok: false, error: limited(error) ? errors.tooMany : errors.generic };
  const { error: memberError } = await createAdminClient().from("members").update({ name: clean }).eq("user_id", user.id);
  if (memberError) return { ok: false, error: errors.generic };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Chiede il cambio di email: il codice arriva al nuovo indirizzo. */
export async function requestEmailChange(email: string): Promise<ProfileResult> {
  const user = await requireUser();
  const clean = String(email ?? "").trim().toLowerCase();
  if (!isEmail(clean) || clean === user.email?.toLowerCase()) return { ok: false, field: "email", error: errors.email };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: clean });
  if (error) {
    if (limited(error)) return { ok: false, error: errors.tooMany };
    if (error.code === "email_exists") return { ok: false, field: "email", error: errors.emailTaken };
    return { ok: false, field: "email", error: errors.generic };
  }
  return { ok: true };
}

export async function confirmEmailChange(email: string, code: string): Promise<ProfileResult> {
  await requireUser();
  const token = normalizeCode(String(code ?? ""));
  if (!isCode(token)) return { ok: false, field: "code", error: errors.code };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: String(email).trim().toLowerCase(), token, type: "email_change" });
  if (error) return { ok: false, field: "code", error: limited(error) ? errors.tooMany : errors.code };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(password: string, repeat: string): Promise<ProfileResult> {
  await requireUser();
  if (String(password ?? "").length < PASSWORD_MIN_LENGTH) return { ok: false, field: "password", error: errors.passwordShort };
  if (password !== repeat) return { ok: false, field: "repeat", error: errors.passwordMismatch };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password, data: { password_changed_at: new Date().toISOString() } });
  if (error) {
    if (error.code === "same_password") return { ok: false, field: "password", error: errors.passwordSame };
    return { ok: false, error: limited(error) ? errors.tooMany : errors.generic };
  }
  return { ok: true };
}

/**
 * C9. Il titolare mette il salone offline (si cancella da solo dopo 30 giorni), il barbiere perde il proprio accesso.
 * Poi l'account viene tolto: chi è dentro non rientra più.
 */
export async function deleteAccount(typed: string): Promise<ProfileResult> {
  const user = await requireUser();
  if (!isDeleteConfirmed(String(typed ?? ""))) return { ok: false, error: errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_account_deletion");
  if (error) return { ok: false, error: profileCopy.del.error };
  const { error: authError } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (authError) return { ok: false, error: profileCopy.del.error };
  await supabase.auth.signOut();
  redirect("/?account=eliminato");
}

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PHOTO_MAX = 512 * 1024;

/** Telefono e colore in agenda di chi è dentro: ogni persona cambia solo il proprio posto. */
export async function saveMemberProfile(input: { phone: string; color: number }): Promise<ProfileResult> {
  const user = await requireUser();
  const phone = String(input.phone ?? "").trim();
  if (phone && !isPhone(phone)) return { ok: false, field: "phone", error: errors.phone };
  const color = Number.isInteger(input.color) && input.color >= 0 && input.color <= 3 ? input.color : null;
  const { error } = await createAdminClient()
    .from("members")
    .update({ phone: phone || null, agenda_color: color })
    .eq("user_id", user.id)
    .eq("active", true);
  if (error) return { ok: false, error: errors.generic };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** «Prenotabile online»: se spento, il barbiere non compare sul link del salone. */
export async function setBookableOnline(value: boolean): Promise<ProfileResult> {
  const user = await requireUser();
  const { error } = await createAdminClient().from("members").update({ bookable_online: Boolean(value) }).eq("user_id", user.id).eq("active", true);
  if (error) return { ok: false, error: errors.generic };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Foto di chi lavora: bucket privato, quadrata e piccola (la prepara il browser). */
export async function setMemberPhoto(form: FormData): Promise<ProfileResult> {
  const { id, salon } = await requireSalon();
  const file = form.get("photo");
  if (!(file instanceof File) || !PHOTO_TYPES.has(file.type) || file.size === 0 || file.size > PHOTO_MAX) return { ok: false, error: errors.photo };
  const supabase = await createClient();
  const { data: me } = await supabase.from("members").select("photo_path").eq("id", id).single();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${salon.id}/${id}/${Date.now()}.${ext}`;
  const up = await supabase.storage.from("member-photos").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { ok: false, error: errors.generic };
  const { error } = await createAdminClient().from("members").update({ photo_path: path }).eq("id", id);
  if (error) {
    await supabase.storage.from("member-photos").remove([path]);
    return { ok: false, error: errors.generic };
  }
  if (me?.photo_path) await supabase.storage.from("member-photos").remove([me.photo_path]);
  revalidatePath("/", "layout");
  return { ok: true };
}
