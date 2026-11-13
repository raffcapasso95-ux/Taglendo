import "server-only";
import { comuneBySlug, findComune, nearestComune } from "@/lib/places/comuni";
import { geocodeAddress } from "@/lib/places/geocode";
import { salonLogoUrl } from "@/lib/salon/logo";
import { createAnonClient } from "@/lib/supabase/anon";
import { env } from "@/lib/supabase/env";
import { RADIUS_KM, WIDE_RADIUS_KM, type SearchQuery } from "./rules";

export type SalonHit = {
  slug: string;
  name: string;
  address: string | null;
  area: string | null;
  city: string | null;
  lat: number;
  lng: number;
  coverUrl: string | null;
  logoUrl: string | null;
  bookingOnline: boolean;
  priceFromCents: number | null;
  services: Array<{ name: string; durationMin: number; priceCents: number | null }>;
  distanceKm: number;
  nextSlots: string[];
};

/** Un salone arrivato da poco, per la home. */
export type RecentSalon = { slug: string; name: string; where: string; coverUrl: string | null; logoUrl: string | null; priceFromCents: number | null; services: string[] };

export type SearchResult =
  | { kind: "none" }
  | { kind: "unknown"; text: string }
  | { kind: "ok"; place: string | null; near: boolean; center: { lat: number; lng: number }; radiusKm: number; widened: boolean; hits: SalonHit[] };

const photoUrl = (path: string | null) => (path ? `${env.url()}/storage/v1/object/public/salon-photos/${path}` : null);

async function around(lat: number, lng: number, radius: number): Promise<SalonHit[]> {
  const { data } = await createAnonClient().rpc("search_salons", { p_lat: lat, p_lng: lng, p_radius_km: radius });
  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    address: r.address,
    area: r.area,
    city: r.city,
    lat: r.lat,
    lng: r.lng,
    coverUrl: photoUrl(r.cover_path),
    logoUrl: salonLogoUrl(r.logo_path),
    bookingOnline: r.booking_online,
    priceFromCents: r.price_from_cents,
    services: ((r.services ?? []) as Array<{ name: string; duration_min: number; price_cents: number | null }>).map((x) => ({ name: x.name, durationMin: x.duration_min, priceCents: x.price_cents })),
    distanceKm: r.distance_km,
    nextSlots: r.next_slots ?? [],
  }));
}

/** I saloni attorno a un punto: entro 30 km, e se non c'è niente i più vicini fino a 150 km. */
async function searchAt(center: { lat: number; lng: number }, place: string | null, near: boolean): Promise<SearchResult> {
  let hits = await around(center.lat, center.lng, RADIUS_KM);
  let widened = false;
  if (hits.length === 0) {
    hits = await around(center.lat, center.lng, WIDE_RADIUS_KM);
    widened = hits.length > 0;
  }
  return { kind: "ok", place, near, center, radiusKm: widened ? WIDE_RADIUS_KM : RADIUS_KM, widened, hits };
}

/** La ricerca: un punto («Vicino a me»), un comune, o un indirizzo (con Google, se c'è la chiave). */
export async function searchSalons(query: SearchQuery): Promise<SearchResult> {
  if (query.kind === "none") return { kind: "none" };
  if (query.kind === "point") return searchAt(query, nearestComune(query.lat, query.lng)?.name ?? null, true);
  const comune = findComune(query.text);
  if (comune) return searchAt(comune, comune.name, false);
  const pos = await geocodeAddress(query.text);
  if (pos) return searchAt(pos, pos.city ?? query.text, false);
  return { kind: "unknown", text: query.text };
}

/** La pagina di una città (`/barbieri/bologna`): null se la città non esiste. */
export async function searchCity(slug: string): Promise<Extract<SearchResult, { kind: "ok" }> | null> {
  const comune = comuneBySlug(slug);
  if (!comune) return null;
  return (await searchAt(comune, comune.name, false)) as Extract<SearchResult, { kind: "ok" }>;
}

export type CityCount = { city: string; salons: number };

/** Le città con almeno un salone in elenco, dalla più fornita. */
export async function listedCities(): Promise<CityCount[]> {
  const { data } = await createAnonClient().rpc("salon_cities");
  return (data ?? []).filter((c): c is { city: string; salons: number; lat: number; lng: number } => Boolean(c.city)).map((c) => ({ city: c.city, salons: c.salons }));
}

/** Gli ultimi saloni arrivati su Taglendo (prima chi ha una foto). */
export async function recentSalons(limit = 8): Promise<RecentSalon[]> {
  const { data } = await createAnonClient().rpc("recent_salons", { p_limit: limit });
  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    where: r.area || r.city || "",
    coverUrl: photoUrl(r.cover_path),
    logoUrl: salonLogoUrl(r.logo_path),
    priceFromCents: r.price_from_cents,
    services: r.services ?? [],
  }));
}
