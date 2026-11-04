import { isEmail } from "@/lib/rules/forms";
import { createClient } from "@/lib/supabase/server";

/**
 * «Accedi di nuovo» (D4): la sessione è scaduta mentre l'app era aperta. Rientra con la sola password e senza
 * reindirizzamenti, così la pagina sotto resta com'era. È una rotta e non un'azione perché le azioni dell'app
 * passano dal proxy, che con la sessione scaduta rimanderebbe all'accesso.
 */
export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ ok: false }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isEmail(email) || !password) return Response.json({ ok: false }, { status: 400 });
  const supabase = await createClient({ remember: true });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return Response.json({ ok: false, wrong: error.code === "invalid_credentials" }, { status: error.code === "invalid_credentials" ? 401 : 500 });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
