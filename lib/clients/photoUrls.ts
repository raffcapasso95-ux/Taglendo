import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Indirizzi firmati (un'ora) per le foto dei clienti: il bucket è privato. Chiave = percorso salvato. */
export async function signedPhotoUrls(supabase: SupabaseClient<Database>, paths: Array<string | null | undefined>): Promise<Map<string, string>> {
  const wanted = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const out = new Map<string, string>();
  if (wanted.length === 0) return out;
  const { data } = await supabase.storage.from("client-photos").createSignedUrls(wanted, 3600);
  for (const row of data ?? []) if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  return out;
}
