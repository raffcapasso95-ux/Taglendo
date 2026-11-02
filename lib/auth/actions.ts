"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCopy } from "@/lib/copy/auth";
import { isCode, isEmail, isPersonName, LIMITS, normalizeCode, safeNext } from "@/lib/rules/forms";
import { PASSWORD_MIN_LENGTH } from "@/lib/rules/password";
import { REMEMBER_COOKIE } from "@/lib/supabase/cookies";
import { env } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const { errors } = authCopy;

export type AuthState = {
  error?: string;
  field?: "email" | "password" | "repeat" | "name" | "terms" | "code";
  /** Per mostrare "Email inviata" dopo la richiesta del link. */
  sent?: boolean;
  email?: string;
};

const VERIFY_COOKIE = "tg_verify_email";
const THIRTY_MINUTES = 30 * 60;
const THIRTY_DAYS = 30 * 24 * 60 * 60;

const text = (data: FormData, key: string) => String(data.get(key) ?? "");

function errorFor(error: { code?: string; status?: number; message?: string }): string {
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" || error.status === 429) {
    return errors.tooMany;
  }
  return errors.generic;
}

async function setVerifyCookie(email: string) {
  (await cookies()).set(VERIFY_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: THIRTY_MINUTES,
    path: "/",
  });
}

/** A2: registrazione. Manda il codice e porta alla verifica. */
export async function signUp(_prev: AuthState, data: FormData): Promise<AuthState> {
  const name = text(data, "name").trim();
  const email = text(data, "email").trim().toLowerCase();
  const password = text(data, "password");

  if (!isPersonName(name, LIMITS.memberName)) return { field: "name", error: errors.nameShort };
  if (!isEmail(email)) return { field: "email", error: authCopy.invalidEmail };
  if (password.length < PASSWORD_MIN_LENGTH) return { field: "password", error: errors.passwordShort };
  if (data.get("terms") !== "on") return { field: "terms", error: errors.termsRequired };

  const supabase = await createClient({ remember: true });
  const { data: result, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${env.siteUrl()}/accedi` },
  });
  if (error) return { error: errorFor(error) };
  // Con la conferma attiva, un indirizzo già registrato non genera errore ma torna senza identità.
  if (result.user && (result.user.identities?.length ?? 0) === 0) {
    return { field: "email", error: errors.alreadyRegistered };
  }

  await setVerifyCookie(email);
  redirect("/verifica");
}

/** A3: conferma del codice. Alla prima verifica crea il salone in prova. */
export async function verifyCode(_prev: AuthState, data: FormData): Promise<AuthState> {
  const code = normalizeCode(text(data, "code"));
  const email = (await cookies()).get(VERIFY_COOKIE)?.value;
  if (!email) redirect("/registrati");
  if (!isCode(code)) return { field: "code", error: authCopy.wrongCode };

  const supabase = await createClient({ remember: true });
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
  if (error) {
    if (error.status === 429) return { field: "code", error: errors.tooMany };
    return { field: "code", error: authCopy.wrongCode };
  }

  const { error: rpcError } = await supabase.rpc("register_salon");
  if (rpcError) return { error: errors.generic };

  (await cookies()).delete(VERIFY_COOKIE);
  redirect("/primo-avvio/1");
}

/** A3: "invia di nuovo". */
export async function resendCode(): Promise<AuthState> {
  const email = (await cookies()).get(VERIFY_COOKIE)?.value;
  if (!email) redirect("/registrati");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { error: errorFor(error) };
  await setVerifyCookie(email); // rinnova i 30 minuti
  return { sent: true };
}

/** A1: accesso con email e password. */
export async function signIn(_prev: AuthState, data: FormData): Promise<AuthState> {
  const email = text(data, "email").trim().toLowerCase();
  const password = text(data, "password");
  const remember = data.get("remember") === "on";
  const next = safeNext(text(data, "next"));

  if (!isEmail(email)) return { field: "email", error: authCopy.invalidEmail };
  if (!password) return { field: "password", error: errors.credentials };

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, remember ? "1" : "0", {
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: THIRTY_DAYS } : {}),
  });

  const supabase = await createClient({ remember });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      // Registrazione lasciata a metà: rimanda il codice e riparte dalla verifica.
      await supabase.auth.resend({ type: "signup", email });
      await setVerifyCookie(email);
      redirect("/verifica");
    }
    if (error.code === "invalid_credentials") return { field: "password", error: errors.credentials };
    return { error: errorFor(error) };
  }
  redirect(next);
}

/** A4: manda il link per scegliere una nuova password. Risponde sempre "inviata". */
export async function requestPasswordReset(_prev: AuthState, data: FormData): Promise<AuthState> {
  const email = text(data, "email").trim().toLowerCase();
  if (!isEmail(email)) return { field: "email", error: authCopy.invalidEmail };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  // Non diciamo se l'indirizzo esiste. Segnaliamo solo i limiti di invio.
  if (error && (error.status === 429 || error.code === "over_email_send_rate_limit")) {
    return { field: "email", error: errors.tooMany };
  }
  return { sent: true, email };
}

/** A5: salva la nuova password (si arriva dal link con una sessione di recupero). */
export async function setNewPassword(_prev: AuthState, data: FormData): Promise<AuthState> {
  const password = text(data, "password");
  const repeat = text(data, "repeat");
  if (password.length < PASSWORD_MIN_LENGTH) return { field: "password", error: errors.passwordShort };
  if (password !== repeat) return { field: "repeat", error: authCopy.newPassword.mismatch };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { field: "password", error: errors.generic };
    return { error: errors.linkExpired };
  }
  redirect("/agenda");
}

/** Apple e Google: i pulsanti compaiono solo se il provider è acceso (variabili d'ambiente). */
export async function signInWithProvider(data: FormData): Promise<void> {
  const provider = text(data, "provider");
  if (provider !== "apple" && provider !== "google") redirect("/accedi");
  const enabled = provider === "apple" ? process.env.NEXT_PUBLIC_AUTH_APPLE : process.env.NEXT_PUBLIC_AUTH_GOOGLE;
  if (enabled !== "true") redirect("/accedi");

  const next = safeNext(text(data, "next"));
  const supabase = await createClient({ remember: true });
  const { data: result, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${env.siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !result.url) redirect("/accedi");
  redirect(result.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/accedi");
}
