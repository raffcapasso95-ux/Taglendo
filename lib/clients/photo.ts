"use server";

import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** La foto è un dato personale: bucket privato, fino a 512 KB, ridimensionata dal browser prima di partire. */
const MAX_BYTES = 512 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "client-photos";

export type PhotoResult = { ok: true } | { ok: false; error: string };

const ERRORS = {
  notAllowed: "Non hai il permesso di cambiare la foto.",
  file: "La foto non va bene: scegli un’immagine più piccola (JPG, PNG o WebP).",
  generic: "Qualcosa non ha funzionato. Riprova.",
} as const;

async function allowed() {
  const m = await requireSalon();
  const supabase = await createClient();
  let canEdit = m.role === "owner";
  if (!canEdit) {
    const { data } = await supabase.from("salons").select("barbers_edit").eq("id", m.salon.id).single();
    canEdit = data?.barbers_edit ?? false;
  }
  return { supabase, salonId: m.salon.id, canEdit };
}

/** Salva (o sostituisce) la foto di un cliente: il file arriva nel campo `photo` del modulo. */
export async function setClientPhoto(clientId: string, form: FormData): Promise<PhotoResult> {
  const { supabase, salonId, canEdit } = await allowed();
  if (!canEdit) return { ok: false, error: ERRORS.notAllowed };
  const file = form.get("photo");
  if (!(file instanceof File) || !TYPES.has(file.type) || file.size === 0 || file.size > MAX_BYTES) return { ok: false, error: ERRORS.file };

  const { data: client } = await supabase.from("clients").select("id, photo_path").eq("id", clientId).eq("salon_id", salonId).maybeSingle();
  if (!client) return { ok: false, error: ERRORS.generic };

  // un nome nuovo a ogni foto: l'indirizzo firmato della vecchia non resta in giro per caso
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${salonId}/${clientId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: ERRORS.generic };
  const { error: updateError } = await supabase.from("clients").update({ photo_path: path }).eq("id", clientId).eq("salon_id", salonId);
  if (updateError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: ERRORS.generic };
  }
  if (client.photo_path) await supabase.storage.from(BUCKET).remove([client.photo_path]);
  revalidatePath("/clienti");
  revalidatePath("/agenda");
  return { ok: true };
}

/** Toglie la foto: tornano le iniziali nel colore. */
export async function removeClientPhoto(clientId: string): Promise<PhotoResult> {
  const { supabase, salonId, canEdit } = await allowed();
  if (!canEdit) return { ok: false, error: ERRORS.notAllowed };
  const { data: client } = await supabase.from("clients").select("photo_path").eq("id", clientId).eq("salon_id", salonId).maybeSingle();
  if (!client) return { ok: false, error: ERRORS.generic };
  const { error } = await supabase.from("clients").update({ photo_path: null }).eq("id", clientId).eq("salon_id", salonId);
  if (error) return { ok: false, error: ERRORS.generic };
  if (client.photo_path) await supabase.storage.from(BUCKET).remove([client.photo_path]);
  revalidatePath("/clienti");
  revalidatePath("/agenda");
  return { ok: true };
}
