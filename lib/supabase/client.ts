import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { env } from "./env";

/** Client Supabase per i componenti nel browser (chiave pubblica, soggetto a RLS). */
export function createClient() {
  return createBrowserClient<Database>(env.url(), env.anonKey());
}
