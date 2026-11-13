"use server";

import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { paginaCopy } from "@/lib/copy/pagina";
import { LIMITS, isPhone } from "@/lib/rules/forms";
import { updateSalonPosition } from "@/lib/places/geocode";
import { createClient } from "@/lib/supabase/server";

const { errors } = paginaCopy;
export type PageResult = { ok: true } | { ok: false; error: string; field?: "name" | "phone" | "address" | "description" };

const MAX_PHOTO = 1.5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "salon-photos";

async function owner() {
  const m = await requireSalon();
  if (m.role !== "owner") throw new Error("Solo il titolare");
  return { salonId: m.salon.id, supabase: await createClient() };
}

const refresh = () => {
  revalidatePath("/impostazioni/pagina");
  revalidatePath("/", "layout");
};

/** Nome, zona, descrizione, telefono e indirizzo che si leggono sulla pagina pubblica. */
export async function saveSalonPage(input: { name: string; area: string; description: string; phone: string; address: string }): Promise<PageResult> {
  const { salonId, supabase } = await owner();
  const name = String(input.name ?? "").trim();
  const area = String(input.area ?? "").trim();
  const description = String(input.description ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  const address = String(input.address ?? "").trim();
  if (!name || name.length > LIMITS.salonName) return { ok: false, field: "name", error: errors.name };
  if (!phone || !isPhone(phone)) return { ok: false, field: "phone", error: errors.phone };
  if (!address || address.length > 120) return { ok: false, field: "address", error: errors.address };
  if (description.length > 160) return { ok: false, field: "description", error: errors.description };
  const { error } = await supabase
    .from("salons")
    .update({ name, area: area || null, description: description || null, phone, address })
    .eq("id", salonId);
  if (error) return { ok: false, error: errors.generic };
  // la ricerca dei saloni usa la posizione: segue l'indirizzo
  await updateSalonPosition(supabase, salonId, address);
  refresh();
  return { ok: true };
}

/** Gli interruttori di «Prenotazione»: prenotazione online e prezzi in pagina. */
export async function setSalonSwitch(key: "booking_online" | "show_prices" | "listed", value: boolean): Promise<PageResult> {
  const { salonId, supabase } = await owner();
  if (key !== "booking_online" && key !== "show_prices" && key !== "listed") return { ok: false, error: errors.generic };
  const patch = key === "booking_online" ? { booking_online: Boolean(value) } : key === "show_prices" ? { show_prices: Boolean(value) } : { listed: Boolean(value) };
  const { error } = await supabase.from("salons").update(patch).eq("id", salonId);
  if (error) return { ok: false, error: errors.generic };
  refresh();
  return { ok: true };
}

/** La copertina della pagina pubblica è la prima foto: la tengo allineata. */
async function syncCover(supabase: Awaited<ReturnType<typeof createClient>>, salonId: string) {
  const { data } = await supabase.from("salon_photos").select("path").eq("salon_id", salonId).order("sort").order("created_at").limit(1).maybeSingle();
  await supabase.from("salons").update({ cover_path: data?.path ?? null }).eq("id", salonId);
}

export async function addSalonPhoto(form: FormData): Promise<PageResult> {
  const { salonId, supabase } = await owner();
  const file = form.get("photo");
  if (!(file instanceof File) || !TYPES.has(file.type) || file.size === 0 || file.size > MAX_PHOTO) return { ok: false, error: errors.photo };
  const { count } = await supabase.from("salon_photos").select("id", { count: "exact", head: true }).eq("salon_id", salonId);
  if ((count ?? 0) >= 8) return { ok: false, error: errors.tooMany };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${salonId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { ok: false, error: errors.generic };
  const { data: last } = await supabase.from("salon_photos").select("sort").eq("salon_id", salonId).order("sort", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("salon_photos").insert({ salon_id: salonId, path, sort: (last?.sort ?? -1) + 1 });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: error.code === "23514" ? errors.tooMany : errors.generic };
  }
  await syncCover(supabase, salonId);
  refresh();
  return { ok: true };
}

export async function removeSalonPhoto(id: string): Promise<PageResult> {
  const { salonId, supabase } = await owner();
  const { data: photo } = await supabase.from("salon_photos").select("path").eq("id", id).eq("salon_id", salonId).maybeSingle();
  if (!photo) return { ok: false, error: errors.generic };
  const { error } = await supabase.from("salon_photos").delete().eq("id", id).eq("salon_id", salonId);
  if (error) return { ok: false, error: errors.generic };
  await supabase.storage.from(BUCKET).remove([photo.path]);
  await syncCover(supabase, salonId);
  refresh();
  return { ok: true };
}

export async function makeCover(id: string): Promise<PageResult> {
  const { salonId, supabase } = await owner();
  const { data: first } = await supabase.from("salon_photos").select("sort").eq("salon_id", salonId).order("sort").limit(1).maybeSingle();
  const { error } = await supabase
    .from("salon_photos")
    .update({ sort: (first?.sort ?? 0) - 1 })
    .eq("id", id)
    .eq("salon_id", salonId);
  if (error) return { ok: false, error: errors.generic };
  await syncCover(supabase, salonId);
  refresh();
  return { ok: true };
}

/** NUOVO: il logo del salone (si vede in agenda e sulla pagina pubblica). Sostituisce quello di prima. */
export async function setSalonLogo(form: FormData): Promise<PageResult> {
  const { salonId, supabase } = await owner();
  const file = form.get("logo");
  if (!(file instanceof File) || !TYPES.has(file.type) || file.size === 0 || file.size > MAX_PHOTO) return { ok: false, error: errors.photo };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${salonId}/logo-${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) return { ok: false, error: errors.generic };
  const { data: before } = await supabase.from("salons").select("logo_path").eq("id", salonId).single();
  const { error } = await supabase.from("salons").update({ logo_path: path }).eq("id", salonId);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: errors.generic };
  }
  if (before?.logo_path) await supabase.storage.from(BUCKET).remove([before.logo_path]);
  refresh();
  return { ok: true };
}

export async function removeSalonLogo(): Promise<PageResult> {
  const { salonId, supabase } = await owner();
  const { data: before } = await supabase.from("salons").select("logo_path").eq("id", salonId).single();
  const { error } = await supabase.from("salons").update({ logo_path: null }).eq("id", salonId);
  if (error) return { ok: false, error: errors.generic };
  if (before?.logo_path) await supabase.storage.from(BUCKET).remove([before.logo_path]);
  refresh();
  return { ok: true };
}
