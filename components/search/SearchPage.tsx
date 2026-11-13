import Link from "next/link";
import { searchCopy } from "@/lib/copy/search";
import { formatPrice } from "@/lib/dates/format";
import { citySlug, distanceLabel } from "@/lib/places/comuni";
import type { CityCount, SalonHit, SearchResult } from "@/lib/search/load";
import { RADIUS_KM } from "@/lib/search/rules";
import { resultsTitle, slotChips, type SearchFilters } from "@/lib/search/rules";
import { romeDate } from "@/lib/dates/rome";
import { Results } from "./Results";
import { SearchBox } from "./SearchBox";
import type { SalonView } from "./types";
import styles from "./Search.module.css";

const copy = searchCopy;

export const toView = (h: SalonHit, now: Date): SalonView => ({
  slug: h.slug,
  name: h.name,
  where: h.area || h.address || h.city || "",
  lat: h.lat,
  lng: h.lng,
  coverUrl: h.coverUrl,
  logoUrl: h.logoUrl,
  distance: distanceLabel(h.distanceKm),
  price: h.priceFromCents !== null ? copy.card.from(formatPrice(h.priceFromCents)) : null,
  services: h.services.map((x) => ({ name: x.name, duration: `${x.durationMin} min`, price: x.priceCents !== null ? formatPrice(x.priceCents) : null })),
  ...(({ day, chips }) => ({ slotDay: day, slots: chips }))(slotChips(h.nextSlots, now)),
  bookingOnline: h.bookingOnline,
});

export function CityLinks({ cities }: { cities: CityCount[] }) {
  if (cities.length === 0) return null;
  return (
    <ul className={styles.cities}>
      {cities.map((c) => (
        <li key={c.city}>
          <Link href={`/barbieri/${citySlug(c.city)}`} className={styles.city}>
            {c.city}
            <span className={styles.cityCount}>{copy.home.citySalons(c.salons)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** NUOVO: la pagina dei risultati, usata da /cerca e dalle pagine per città. */
export function SearchPage({ result, cities, services, typed, filters }: { result: SearchResult; cities: CityCount[]; services: string[]; typed: string; filters: SearchFilters }) {
  const now = new Date();
  const today = romeDate(now);
  const ok = result.kind === "ok" ? result : null;
  const place = ok?.place ?? "";
  const title = !ok ? copy.results.headingEmpty : resultsTitle({ place: ok.place, near: ok.near, service: filters.service, date: filters.date, today });
  const filtered = Boolean(filters.service || filters.date);

  return (
    <div className={styles.page}>
      <div className={styles.searchRow}>
        <SearchBox initial={ok && !ok.near ? place : typed} service={filters.service ?? ""} date={filters.date} services={services} compact />
      </div>
      <h1 className={styles.title}>{title}</h1>

      {result.kind === "none" && filtered ? (
        <p className={styles.notice} role="status">
          {copy.results.needPlace}
        </p>
      ) : null}

      {result.kind === "unknown" ? (
        <p className={styles.notice} role="status">
          {copy.results.unknown(result.text)}
        </p>
      ) : null}

      {ok && ok.hits.length > 0 ? (
        <>
          {ok.widened ? (
            <p className={styles.notice} role="status">
              {copy.results.wider(RADIUS_KM, place || "te")}
            </p>
          ) : null}
          <Results salons={ok.hits.map((h) => toView(h, now))} center={ok.center} summary={`${copy.results.count(ok.hits.length, ok.radiusKm)} · ${copy.results.sorted}`} />
        </>
      ) : null}

      {ok && ok.hits.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{filtered ? copy.results.noneFiltered(place || "te") : copy.results.none(place || "te")}</p>
          <p className={styles.emptyText}>{filtered ? copy.results.noneFilteredHint : copy.results.noneHint}</p>
          <Link href="/per-i-saloni" className={styles.link}>
            {copy.results.owner}
          </Link>
        </div>
      ) : null}

      {!ok || ok.hits.length === 0 ? (
        <section aria-labelledby="citta-t" className={styles.citiesBlock}>
          {cities.length > 0 ? (
            <>
              <h2 id="citta-t" className={styles.emptyTitle}>
                {copy.home.citiesTitle}
              </h2>
              <CityLinks cities={cities} />
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

/** Mentre arrivano i risultati: il titolo e il campo ci sono già, l'elenco è in attesa. */
export function SearchSkeleton() {
  return (
    <div className={styles.page} aria-busy="true">
      <div className={styles.searchRow}>
        <SearchBox services={[]} compact />
      </div>
      <h1 className={styles.title}>{copy.results.headingEmpty}</h1>
      <div className={styles.skeleton} aria-hidden="true" />
      <div className={styles.skeleton} aria-hidden="true" />
    </div>
  );
}
