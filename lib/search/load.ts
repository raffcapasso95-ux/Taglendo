import "server-only";
import { comuneBySlug, findComune, nearestComune } from "@/lib/places/comuni";
import { geocodeAddress } from "@/lib/places/geocode";
import { salonLogoUrl } from "@/lib/salon/logo";
import { createAnonClient } from "@/lib/supabase/anon";
import { env } from "@/lib/supabase/env";
import { NO_FILTERS, RADIUS_KM, SERVICE_TERM, WIDE_RADIUS_KM, isNarrowed, type SearchFilters, type SearchQuery } from "./rules";

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
  /** Aperto in questo momento, e se sì a che ora chiude la fascia in corso (minuti dalla mezzanotte). */
  openNow: boolean;
  closesMin: number | null;
  /** Arrivato su Taglendo da 30 giorni o meno. */
  isNew: boolean;
  /** Barbieri prenotabili online. */
  barbers: number;
};

/** Un salone arrivato da poco, per la home. */
export type RecentSalon = {
  slug: string;
  name: string;
  /** L'indirizzo (o la zona). */
  where: string;
  city: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  services: string[];
  /** Il primo orario libero di oggi, se c'è. */
  firstToday: string | null;
  barbers: number;
};

export type SearchResult =
  | { kind: "none" }
  | { kind: "unknown"; text: string }
  | { kind: "ok"; place: string | null; near: boolean; center: { lat: number; lng: number }; radiusKm: number; widened: boolean; hits: SalonHit[]; filters: SearchFilters };

const photoUrl = (path: string | null) => (path ? `${env.url()}/storage/v1/object/public/salon-photos/${path}` : null);

async function around(lat: number, lng: number, radius: number, filters: SearchFilters): Promise<SalonHit[]> {
  const { data } = await createAnonClient().rpc("find_salons", {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radius,
    p_limit: 40,
    // servizio e giorno sempre passati (anche vuoti): così si usa la versione della ricerca con i filtri
    p_service: filters.service ?? "",
    p_date: filters.date as string,
    p_filters: {
      ...(filters.services.length ? { services: filters.services.map((k) => SERVICE_TERM[k]) } : {}),
      ...(filters.openNow ? { open_now: true } : {}),
      ...(filters.freeToday ? { free_today: true } : {}),
      ...(filters.isNew ? { is_new: true } : {}),
      ...(filters.band ? { band: filters.band } : {}),
      ...(filters.sort === "first" ? { sort: "first" } : {}),
    },
  });
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
    openNow: r.open_now,
    closesMin: r.closes_min,
    isNew: r.is_new,
    barbers: r.barbers,
  }));
}

/** I saloni attorno a un punto: entro 30 km, e se non c'è niente i più vicini fino a 150 km. */
async function searchAt(center: { lat: number; lng: number }, place: string | null, near: boolean, filters: SearchFilters): Promise<SearchResult> {
  const radius = filters.maxKm ?? RADIUS_KM;
  let hits = await around(center.lat, center.lng, radius, filters);
  let widened = false;
  // i filtri della barra (e la distanza scelta) non si allargano: «nessuna barberia con questi filtri» è la risposta giusta
  if (hits.length === 0 && !isNarrowed(filters)) {
    hits = await around(center.lat, center.lng, WIDE_RADIUS_KM, filters);
    widened = hits.length > 0;
  }
  return { kind: "ok", place, near, center, radiusKm: widened ? WIDE_RADIUS_KM : radius, widened, hits, filters };
}

/** La ricerca: un punto («Vicino a me»), un comune, o un indirizzo (con Google, se c'è la chiave). */
export async function searchSalons(query: SearchQuery, filters: SearchFilters = NO_FILTERS): Promise<SearchResult> {
  if (query.kind === "none") return { kind: "none" };
  if (query.kind === "point") return searchAt(query, nearestComune(query.lat, query.lng)?.name ?? null, !query.zone, filters);
  const comune = findComune(query.text);
  if (comune) return searchAt(comune, comune.name, false, filters);
  const pos = await geocodeAddress(query.text);
  if (pos) return searchAt(pos, pos.city ?? query.text, false, filters);
  return { kind: "unknown", text: query.text };
}

/** La pagina di una città (`/barbieri/bologna`): null se la città non esiste. */
export async function searchCity(slug: string, filters: SearchFilters = NO_FILTERS): Promise<Extract<SearchResult, { kind: "ok" }> | null> {
  const comune = comuneBySlug(slug);
  if (!comune) return null;
  return (await searchAt(comune, comune.name, false, filters)) as Extract<SearchResult, { kind: "ok" }>;
}

/** I servizi più diffusi tra i saloni in elenco, per i suggerimenti del campo «Servizio». */
export async function popularServices(limit = 12): Promise<string[]> {
  const { data } = await createAnonClient().rpc("service_names", { p_limit: limit });
  return (data ?? []).map((r) => r.name).filter((n): n is string => Boolean(n));
}

export type CityCount = { city: string; salons: number };

/** Le città con almeno un salone in elenco, dalla più fornita. */
export async function listedCities(): Promise<CityCount[]> {
  const { data } = await createAnonClient().rpc("salon_cities");
  return (data ?? []).filter((c): c is { city: string; salons: number; lat: number; lng: number } => Boolean(c.city)).map((c) => ({ city: c.city, salons: c.salons }));
}

/** Gli ultimi saloni arrivati su Taglendo, in ordine di arrivo (niente ordinamenti «di qualità»). */
export async function recentSalons(limit = 8): Promise<RecentSalon[]> {
  const { data } = await createAnonClient().rpc("recent_salons", { p_limit: limit });
  return (data ?? []).map((r) => ({
    slug: r.slug,
    name: r.name,
    where: r.address || r.area || r.city || "",
    city: r.city,
    coverUrl: photoUrl(r.cover_path),
    logoUrl: salonLogoUrl(r.logo_path),
    services: r.services ?? [],
    firstToday: r.first_today,
    barbers: r.barbers,
  }));
}

export type CityStat = { city: string; salons: number; freeToday: number; freeTomorrow: number };

/** Le città con saloni in elenco: quante barberie e quante hanno posto oggi o domani (nessun nome, nessun prezzo). */
export async function cityStats(limit = 12): Promise<CityStat[]> {
  const { data } = await createAnonClient().rpc("city_stats", { p_limit: limit });
  return (data ?? []).map((r) => ({ city: r.city, salons: r.salons, freeToday: r.free_today, freeTomorrow: r.free_tomorrow }));
}
