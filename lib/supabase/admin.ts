import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { env } from "./env";

/**
 * Client con la chiave di servizio: salta la RLS. Solo lato server, solo per
 * operazioni che nessun utente può fare da sé (accettare un invito, webhook).
 * Mai passarlo a componenti client.
 */
export function createAdminClient() {
  return createClient<Database>(env.url(), env.serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
