import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "./env";

/** Client Supabase per Server Components, Server Actions e Route Handlers. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.url(), env.anonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chiamato da un Server Component: i cookie si aggiornano nel proxy.
        }
      },
    },
  });
}
