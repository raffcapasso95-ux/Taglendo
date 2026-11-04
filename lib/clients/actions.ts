"use server";

import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { LIMITS } from "@/lib/rules/forms";
import { createClient } from "@/lib/supabase/server";

export type NoteResult = { ok: true } | { ok: false; error: string };

/** Salva la nota privata di un cliente. Serve il permesso di modificare (titolare, o barbiere con “modifica”). */
export async function saveClientNote(clientId: string, note: string): Promise<NoteResult> {
  const { salon } = await requireSalon();
  const text = note.trim();
  if (text.length > LIMITS.clientNote) return { ok: false, error: `La nota può avere al massimo ${LIMITS.clientNote} caratteri.` };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ note: text })
    .eq("id", clientId)
    .eq("salon_id", salon.id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Non siamo riusciti a salvare la nota. Riprova." };
  revalidatePath(`/clienti/${clientId}`);
  return { ok: true };
}

export type DeleteResult = { ok: true; cancelled: number } | { ok: false; error: string };

/** Elimina un cliente su sua richiesta. Solo il titolare (lo controlla anche il database). */
export async function deleteClient(clientId: string): Promise<DeleteResult> {
  const { role } = await requireSalon();
  if (role !== "owner") return { ok: false, error: "Solo il titolare può eliminare un cliente." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_client", { p_client: clientId });
  if (error) return { ok: false, error: "Non siamo riusciti a eliminare il cliente. Riprova." };
  revalidatePath("/clienti");
  revalidatePath("/agenda");
  return { ok: true, cancelled: data ?? 0 };
}
