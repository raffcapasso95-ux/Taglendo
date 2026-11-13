import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SearchPage, SearchSkeleton } from "@/components/search/SearchPage";
import { searchCopy } from "@/lib/copy/search";
import { romeDate } from "@/lib/dates/rome";
import { listedCities, popularServices, searchSalons } from "@/lib/search/load";
import { parseFilters, parseSearch } from "@/lib/search/rules";

// i risultati dipendono da ciò che si cerca: la pagina generica è indicizzabile, le ricerche no (ci sono le pagine per città)
export const metadata: Metadata = {
  title: searchCopy.meta.searchTitle,
  description: searchCopy.meta.searchDescription,
  alternates: { canonical: "/cerca" },
};

type Params = { dove?: string | string[]; lat?: string | string[]; lng?: string | string[]; servizio?: string | string[]; data?: string | string[] };

/** NUOVO · Elenco dei saloni: `?dove=Bologna` oppure `?lat=&lng=` («Vicino a me»), con `&servizio=` e `&data=` facoltativi. */
async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  await connection(); // la data di oggi va letta a ogni visita, non quando la pagina si prepara
  const query = parseSearch(params);
  const filters = parseFilters(params, romeDate(new Date()));
  const [result, cities, services] = await Promise.all([searchSalons(query, filters), listedCities(), popularServices()]);
  return <SearchPage result={result} cities={cities} services={services} typed={query.kind === "text" ? query.text : ""} filters={filters} />;
}

export default function Page({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
