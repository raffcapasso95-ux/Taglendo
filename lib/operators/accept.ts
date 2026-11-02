"use server";

import { redirect } from "next/navigation";
import { authCopy } from "@/lib/copy/auth";
import { isPersonName, LIMITS } from "@/lib/rules/forms";
import { PASSWORD_MIN_LENGTH } from "@/lib/rules/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const { errors } = authCopy;

export type AcceptState = { error?: string; field?: "name" | "password" };

/** L'invito valido per questo token, con salone e titolare. Null se scaduto, usato o inesistente. */
export async function findInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id, name, salon_id, invite_email, invite_expires_at")
    .eq("invite_token", token)
    .is("user_id", null)
    .gt("invite_expires_at", new Date().toISOString())
    .maybeSingle();
  if (!member?.invite_email) return null;

  const [{ data: salon }, { data: owner }] = await Promise.all([
    admin.from("salons").select("name").eq("id", member.salon_id).single(),
    admin.from("members").select("name").eq("salon_id", member.salon_id).eq("role", "owner").limit(1).maybeSingle(),
  ]);
  if (!salon) return null;
  return {
    memberId: member.id,
    memberName: member.name,
    email: member.invite_email,
    salonName: salon.name,
    ownerName: owner?.name ?? "",
  };
}

/** C7: chi ha ricevuto l'invito sceglie nome e password. L'email è già verificata dall'invito stesso. */
export async function acceptInvite(_prev: AcceptState, data: FormData): Promise<AcceptState> {
  const token = String(data.get("token") ?? "");
  const name = String(data.get("name") ?? "").trim();
  const password = String(data.get("password") ?? "");

  if (!isPersonName(name, LIMITS.memberName)) return { field: "name", error: errors.nameShort };
  if (password.length < PASSWORD_MIN_LENGTH) return { field: "password", error: errors.passwordShort };

  const invite = await findInvite(token);
  if (!invite) return { error: errors.inviteInvalid };

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createError || !created.user) {
    return createError?.code === "email_exists" ? { error: errors.inviteEmailTaken } : { error: errors.generic };
  }

  // Il filtro su token e user_id fa vincere una sola richiesta se l'invito si apre due volte insieme.
  const { data: updated, error: updateError } = await admin
    .from("members")
    .update({ user_id: created.user.id, name, invite_token: null, invite_expires_at: null })
    .eq("id", invite.memberId)
    .eq("invite_token", token)
    .is("user_id", null)
    .select("id");
  if (updateError || !updated || updated.length === 0) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: errors.inviteInvalid };
  }
  await admin.from("notification_prefs").insert({ member_id: invite.memberId });

  const supabase = await createClient({ remember: true });
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: invite.email, password });
  if (signInError) redirect("/accedi");
  redirect("/agenda");
}
