import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/rules/forms";
import { createClient } from "@/lib/supabase/server";

/** Link nelle email di Supabase (recupero password): scambia il token con una sessione. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"), "/nuova-password");

  if (tokenHash && type) {
    const supabase = await createClient({ remember: true });
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  // Link scaduto o già usato
  return NextResponse.redirect(new URL("/password?errore=link", request.url));
}
