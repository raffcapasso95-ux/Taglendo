import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { env } from "@/lib/supabase/env";

/** Il sito, le pagine legali e la pagina di ogni salone. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = env.siteUrl().replace(/\/$/, "");
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/registrati`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/termini`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cookie`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
  const { data } = await createAnonClient().rpc("public_salon_slugs");
  const salons: MetadataRoute.Sitemap = (data ?? []).map((slug) => ({ url: `${base}/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 }));
  return [...fixed, ...salons];
}
