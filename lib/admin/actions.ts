"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/session";
import { adminCopy } from "@/lib/copy/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminResult = { ok: true; message: string } | { ok: false; error: string };

const fail = (error: string): AdminResult => ({ ok: false, error });

/** Il messaggio giusto per l'errore del database (le funzioni lo scrivono già in italiano). */
function explain(error: { code?: string; message?: string }): string {
  if (error.code === "22023" || error.code === "P0002") return error.message ?? adminCopy.errors.generic;
  if (error.code === "42501") return adminCopy.errors.notAllowed;
  return adminCopy.errors.generic;
}

async function run(id: string, call: (rpc: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{ error: { code?: string; message?: string } | null }>, done: string): Promise<AdminResult> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(adminCopy.errors.generic);
  const supabase = await createClient();
  const { error } = await call(supabase);
  if (error) return fail(explain(error));
  revalidatePath(`/admin/saloni/${id}`);
  revalidatePath("/admin/saloni");
  revalidatePath("/admin");
  return { ok: true, message: done };
}

export async function setHidden(id: string, hidden: boolean, reason: string): Promise<AdminResult> {
  return run(id, (s) => s.rpc("admin_set_hidden", { p_id: id, p_hidden: hidden, p_reason: reason.slice(0, 300) }), hidden ? adminCopy.done.hidden : adminCopy.done.shown);
}

export async function setSuspended(id: string, suspended: boolean, reason: string): Promise<AdminResult> {
  if (suspended && !reason.trim()) return fail(adminCopy.errors.reasonNeeded);
  return run(id, (s) => s.rpc("admin_set_suspended", { p_id: id, p_suspended: suspended, p_reason: reason.slice(0, 300) }), suspended ? adminCopy.done.suspended : adminCopy.done.reactivated);
}

export async function extendTrial(id: string, days: number, reason: string): Promise<AdminResult> {
  if (!Number.isInteger(days) || days < 1 || days > 365) return fail(adminCopy.errors.days);
  return run(id, (s) => s.rpc("admin_extend_trial", { p_id: id, p_days: days, p_reason: reason.slice(0, 300) }), adminCopy.done.extended(days));
}

export async function addNote(id: string, body: string): Promise<AdminResult> {
  if (!body.trim() || body.length > 1000) return fail(adminCopy.errors.note);
  return run(id, (s) => s.rpc("admin_add_note", { p_id: id, p_body: body }), adminCopy.done.note);
}

/** Accesso all'area: email e password; chi non è un amministratore non entra e non lo sa. */
export type AdminSignInState = { error?: string };
export async function adminSignIn(_prev: AdminSignInState, data: FormData): Promise<AdminSignInState> {
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const password = String(data.get("password") ?? "");
  if (!email || !password) return { error: adminCopy.signIn.wrong };
  const supabase = await createClient({ remember: true });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.status === 429 ? adminCopy.signIn.tooMany : adminCopy.signIn.wrong };
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { error: adminCopy.signIn.wrong };
  }
  redirect("/admin");
}

export async function adminSignOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/accedi");
}
