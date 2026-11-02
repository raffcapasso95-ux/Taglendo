import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, withRemember } from "@/lib/supabase/cookies";
import type { Database } from "@/lib/supabase/database.types";

/** Aree che richiedono l'accesso. Il controllo vero (salone, ruolo) lo fa il livello dati. */
const PROTECTED = [
  "/agenda", "/clienti", "/link", "/listino", "/impostazioni", "/profilo", "/primo-avvio", "/pronto",
  "/nuova-password",
];
/** Pagine per chi non è ancora entrato: se hai già una sessione vai in agenda. */
const GUEST_ONLY = ["/accedi", "/registrati", "/verifica", "/password"];

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== "0";

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(toSet) {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, withRemember(options, remember));
          }
        },
      },
    },
  );

  // Rinfresca la sessione se serve e verifica la firma del token.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  const redirect = (to: string, search?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    for (const [k, v] of Object.entries(search ?? {})) url.searchParams.set(k, v);
    const res = NextResponse.redirect(url);
    // porta con sé i cookie di sessione appena rinfrescati
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  if (!signedIn && matches(path, PROTECTED)) {
    return redirect("/accedi", { next: path + request.nextUrl.search });
  }
  if (signedIn && matches(path, GUEST_ONLY)) {
    return redirect("/agenda");
  }
  return response;
}

export const config = {
  matcher: [
    // tutto tranne file statici e immagini
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff2?)$).*)",
  ],
};
