import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPage, SearchSkeleton } from "@/components/search/SearchPage";
import { searchCopy } from "@/lib/copy/search";
import { listedCities, searchSalons } from "@/lib/search/load";
import { parseSearch } from "@/lib/search/rules";

// i risultati dipendono da ciò che si cerca: la pagina generica è indicizzabile, le ricerche no (ci sono le pagine per città)
export const metadata: Metadata = {
  title: searchCopy.meta.searchTitle,
  description: searchCopy.meta.searchDescription,
  alternates: { canonical: "/cerca" },
};

type Params = { dove?: string | string[]; lat?: string | string[]; lng?: string | string[] };

/** NUOVO · Elenco dei saloni: `?dove=Bologna` oppure `?lat=&lng=` («Vicino a me»). */
async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  const query = parseSearch(await searchParams);
  const [result, cities] = await Promise.all([searchSalons(query), listedCities()]);
  return <SearchPage result={result} cities={cities} typed={query.kind === "text" ? query.text : ""} />;
}

export default function Page({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
