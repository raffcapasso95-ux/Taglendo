import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { SearchPage, SearchSkeleton } from "@/components/search/SearchPage";
import { searchCopy } from "@/lib/copy/search";
import { citySlug, comuneBySlug } from "@/lib/places/comuni";
import { listedCities, searchCity } from "@/lib/search/load";

type Props = { params: Promise<{ citta: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { citta } = await params;
  const comune = comuneBySlug(citta);
  if (!comune) return {};
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
  const comune = comuneBySlug(citta);
  if (!comune) notFound();
  const canonical = citySlug(comune.name);
  if (citta !== canonical) permanentRedirect(`/barbieri/${canonical}`);
  const [result, cities] = await Promise.all([searchCity(citta), listedCities()]);
  if (!result) notFound();
  return <SearchPage result={result} cities={cities} typed={comune.name} />;
}

export default async function Page({ params }: Props) {
  // la città si controlla prima di mostrare la pagina: così una città inesistente risponde 404 (non 200 con il testo «non trovata»)
  const { citta } = await params;
  const comune = comuneBySlug(citta);
  if (!comune) notFound();
  if (citta !== citySlug(comune.name)) permanentRedirect(`/barbieri/${citySlug(comune.name)}`);
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
