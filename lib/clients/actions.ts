"use server";

import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { isPhone, LIMITS } from "@/lib/rules/forms";
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

export type CreateClientResult = { ok: true; id: string; name: string } | { ok: false; error: string };

/** Il pulsante «+ Nuovo» della rubrica: nome, telefono e nota facoltativi, colore delle iniziali. Chi può fissare appuntamenti può anche creare clienti. */
export async function createClientRecord(input: { name: string; phone?: string | null; note?: string | null; avatarColor: number }): Promise<CreateClientResult> {
  const { salon } = await requireSalon();
  const name = input.name.trim();
  if (!name || name.length > LIMITS.clientName) return { ok: false, error: "Scrivi il nome del cliente." };
  const phone = input.phone?.trim() || null;
  if (phone && !isPhone(phone)) return { ok: false, error: "Il telefono può avere solo cifre, + e spazi." };
  const note = input.note?.trim() || null;
  if (note && note.length > LIMITS.clientNote) return { ok: false, error: `La nota può avere al massimo ${LIMITS.clientNote} caratteri.` };
  const avatar_color = Number.isInteger(input.avatarColor) && input.avatarColor >= 0 && input.avatarColor <= 4 ? input.avatarColor : null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").insert({ salon_id: salon.id, name, phone, note, avatar_color }).select("id").single();
  if (error || !data) return { ok: false, error: "Non siamo riusciti a salvare il cliente. Riprova." };
  revalidatePath("/clienti");
  revalidatePath("/agenda");
  return { ok: true, id: data.id, name };
}

/** Cambia il colore delle iniziali di un cliente. */
export async function setClientColor(clientId: string, color: number): Promise<NoteResult> {
  const { salon } = await requireSalon();
  if (!Number.isInteger(color) || color < 0 || color > 4) return { ok: false, error: "Colore non valido." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").update({ avatar_color: color }).eq("id", clientId).eq("salon_id", salon.id).select("id");
  if (error || !data?.length) return { ok: false, error: "Non siamo riusciti a salvare il colore. Riprova." };
  revalidatePath("/clienti");
  revalidatePath(`/clienti/${clientId}`);
  revalidatePath("/agenda");
  return { ok: true };
}
