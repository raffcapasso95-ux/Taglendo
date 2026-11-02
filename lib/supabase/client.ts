import { createBrowserClient } from "@supabase/ssr";
import { env } from "./env";

/** Client Supabase per i componenti nel browser (chiave pubblica, soggetto a RLS). */
export function createClient() {
  return createBrowserClient(env.url(), env.anonKey());
}
