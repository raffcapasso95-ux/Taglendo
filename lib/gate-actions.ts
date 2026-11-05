"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gateCopy } from "@/lib/copy/gate";
import { checkGateLogin, GATE_COOKIE, GATE_DAYS, signGateToken } from "@/lib/gate";
import { safeNext } from "@/lib/rules/forms";

export type GateState = { error?: string };

/** Accesso riservato: utente e password dalle variabili d'ambiente; se giusti, cookie firmato e si entra. */
export async function gateLogin(_prev: GateState, data: FormData): Promise<GateState> {
  const user = String(data.get("user") ?? "");
  const password = String(data.get("password") ?? "");
  // senza destinazione si va alla home (safeNext, da solo, porterebbe in agenda)
  const rawNext = String(data.get("next") ?? "");
  const next = rawNext ? safeNext(rawNext) : "/";

  if (!(await checkGateLogin(user, password))) {
    // una breve attesa rende lento indovinare la password a tentativi
    await new Promise((r) => setTimeout(r, 800));
    return { error: gateCopy.login.wrong };
  }

  (await cookies()).set(GATE_COOKIE, await signGateToken(process.env.PREVIEW_SECRET!), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GATE_DAYS * 86400,
    path: "/",
  });
  redirect(next);
}
