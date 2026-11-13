import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { comuneInAddress, findComune } from "./comuni";

export type Position = { lat: number; lng: number; city: string | null; precise: boolean };

type GeocodeResponse = {
  status?: string;
  results?: Array<{
    geometry?: { location?: { lat?: number; lng?: number } };
    address_components?: Array<{ long_name?: string; types?: string[] }>;
  }>;
};

/** Dalla risposta di Google: il punto e il comune (locality, o il comune amministrativo). */
export function parseGeocode(body: unknown): Position | null {
  const r = (body as GeocodeResponse | null)?.results?.[0];
  const lat = r?.geometry?.location?.lat;
  const lng = r?.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const part = (type: string) => r?.address_components?.find((c) => c.types?.includes(type))?.long_name ?? null;
  const city = part("locality") ?? part("administrative_area_level_3");
  // il nome come lo scrive l'elenco dei comuni, se c'è («Bologna», non «Bologne»)
  return { lat, lng, city: (city && findComune(city)?.name) || city, precise: true };
}

/**
 * La posizione di un indirizzo: precisa con Google (se c'è GOOGLE_MAPS_API_KEY e la Geocoding API è attiva),
 * altrimenti il centro del comune scritto nell'indirizzo. Null se non si capisce dov'è.
 */
export async function geocodeAddress(address: string): Promise<Position | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (key) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=it&language=it&components=country:IT&key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
      if (res.ok) {
        const hit = parseGeocode(await res.json());
        if (hit) return hit;
      }
    } catch {
      // Google non risponde: si ripiega sul comune
    }
  }
  const comune = comuneInAddress(address);
  return comune ? { lat: comune.lat, lng: comune.lng, city: comune.name, precise: false } : null;
}

/** Dopo che l'indirizzo del salone è cambiato: aggiorna posizione e città (o le toglie, se non si capisce dov'è). */
export async function updateSalonPosition(supabase: SupabaseClient<Database>, salonId: string, address: string): Promise<void> {
  const pos = await geocodeAddress(address);
  await supabase
    .from("salons")
    .update(pos ? { lat: pos.lat, lng: pos.lng, city: pos.city } : { lat: null, lng: null, city: null })
    .eq("id", salonId);
}
