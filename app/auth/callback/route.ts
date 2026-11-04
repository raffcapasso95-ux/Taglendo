import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/rules/forms";
import { createClient } from "@/lib/supabase/server";

/** Ritorno da Apple e Google: scambia il codice con una sessione. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient({ remember: true });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Chi non ha ancora un salone (primo accesso) ne riceve uno in prova.
      const { data: member } = await supabase.from("members").select("id").limit(1).maybeSingle();
      if (!member) await supabase.rpc("register_salon");
      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  return NextResponse.redirect(new URL("/accedi", request.url));
}
