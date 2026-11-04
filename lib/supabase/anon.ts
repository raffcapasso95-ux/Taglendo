import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { env } from "./env";

/**
 * Client senza sessione, per le pagine pubbliche: non legge i cookie e vede solo
 * ciò che le funzioni pubbliche del database restituiscono (es. `public_salon`).
 */
export function createAnonClient() {
  return createClient<Database>(env.url(), env.anonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
