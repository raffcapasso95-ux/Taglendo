import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { REMEMBER_COOKIE, withRemember } from "./cookies";
import type { Database } from "./database.types";
import { env } from "./env";

/**
 * Client Supabase per Server Components, Server Actions e Route Handlers.
 * Gira con i permessi dell'utente che ha fatto l'accesso (soggetto a RLS).
 * `remember` serve solo subito dopo l'accesso, quando il cookie della
 * preferenza non è ancora stato riletto.
 */
export async function createClient(options: { remember?: boolean } = {}) {
  const cookieStore = await cookies();
  const remember = options.remember ?? cookieStore.get(REMEMBER_COOKIE)?.value !== "0";
  return createServerClient<Database>(env.url(), env.anonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options: o } of toSet) {
            cookieStore.set(name, value, withRemember(o, remember));
          }
        } catch {
          // Chiamato da un Server Component: i cookie li aggiorna il proxy.
        }
      },
    },
  });
}
