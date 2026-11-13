import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SearchPage, SearchSkeleton } from "@/components/search/SearchPage";
import { searchCopy } from "@/lib/copy/search";
import { citySlug, comuneBySlug } from "@/lib/places/comuni";
import { listedCities, popularServices, searchCity } from "@/lib/search/load";

type Props = { params: Promise<{ citta: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { citta } = await params;
  const comune = comuneBySlug(citta);
  // i metadati si calcolano prima della pagina: qui una città inesistente risponde 404 e un indirizzo scritto male fa 308
  if (!comune) notFound();
  if (citta !== citySlug(comune.name)) permanentRedirect(`/barbieri/${citySlug(comune.name)}`);
  const result = await searchCity(citta);
  const local = result?.widened ? 0 : (result?.hits.length ?? 0);
  return {
    title: searchCopy.meta.cityTitle(comune.name),
    description: searchCopy.meta.cityDescription(comune.name, local),
    alternates: { canonical: `/barbieri/${citySlug(comune.name)}` },
    // una città senza saloni non va nei motori di ricerca: pagina vuota
    robots: local > 0 ? undefined : { index: false, follow: true },
  };
}

/** NUOVO · I barbieri di una città: `/barbieri/bologna`. Lo stesso elenco di /cerca, con un indirizzo fisso. */
async function Content({ params }: Props) {
  const { citta } = await params;
  await connection(); // orari liberi e «oggi» si leggono a ogni visita
  const comune = comuneBySlug(citta);
  if (!comune) notFound();
  const canonical = citySlug(comune.name);
  if (citta !== canonical) permanentRedirect(`/barbieri/${canonical}`);
  const [result, cities, services] = await Promise.all([searchCity(citta), listedCities(), popularServices()]);
  if (!result) notFound();
  return <SearchPage result={result} cities={cities} services={services} typed={comune.name} filters={result.filters} />;
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
