import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** L'utente con la sessione, se è un amministratore di Taglendo (lo dice il database, non il browser). */
export const getAdmin = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true ? user : null;
});

/**
 * Per le pagine del gestionale: senza sessione si va all'accesso dell'area; con una sessione che non è di un amministratore
 * la pagina «non esiste» (nessun indizio che qui ci sia qualcosa).
 */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/admin/accedi");
  const admin = await getAdmin();
  if (!admin) notFound();
  return admin;
}
