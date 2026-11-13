import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { gateEnabled } from "@/lib/gate";
import { citySlug } from "@/lib/places/comuni";
import { createAnonClient } from "@/lib/supabase/anon";
import { env } from "@/lib/supabase/env";

/** Il sito, le pagine legali, le pagine per città e la pagina di ogni salone. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  if (gateEnabled()) return []; // anteprima privata: niente da indicizzare
  const base = env.siteUrl().replace(/\/$/, "");
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cerca`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/per-i-saloni`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/registrati`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/termini`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cookie`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
  const anon = createAnonClient();
  const [{ data }, { data: cityRows }] = await Promise.all([anon.rpc("public_salon_slugs"), anon.rpc("salon_cities")]);
  const salons: MetadataRoute.Sitemap = (data ?? []).map((slug) => ({ url: `${base}/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 }));
  // le pagine per città con almeno un salone in elenco
  const cities: MetadataRoute.Sitemap = (cityRows ?? [])
    .filter((c) => c.city)
    .map((c) => ({ url: `${base}/barbieri/${citySlug(c.city)}`, lastModified: now, changeFrequency: "daily", priority: 0.8 }));
  return [...fixed, ...cities, ...salons];
}
