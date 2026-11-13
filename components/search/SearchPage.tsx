import Link from "next/link";
import { searchCopy } from "@/lib/copy/search";
import { formatPrice } from "@/lib/dates/format";
import { citySlug, distanceLabel } from "@/lib/places/comuni";
import type { CityCount, SalonHit, SearchResult } from "@/lib/search/load";
import { RADIUS_KM } from "@/lib/search/rules";
import { slotLabel } from "@/lib/search/rules";
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
  services: h.services,
  slot: h.nextSlot ? copy.card.next(slotLabel(h.nextSlot, now)) : null,
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
export function SearchPage({ result, cities, typed }: { result: SearchResult; cities: CityCount[]; typed: string }) {
  const now = new Date();
  const ok = result.kind === "ok" ? result : null;
  const place = ok?.place ?? "";
  const title = !ok ? copy.results.headingEmpty : ok.near ? copy.results.headingNear(ok.place) : copy.results.heading(place);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <SearchBox initial={ok && !ok.near ? place : typed} />

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
          ) : (
            <p className={styles.sub}>{copy.results.count(ok.hits.length, ok.radiusKm)}</p>
          )}
          <Results salons={ok.hits.map((h) => toView(h, now))} center={ok.center} />
        </>
      ) : null}

      {ok && ok.hits.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{copy.results.none(place || "te")}</p>
          <p className={styles.emptyText}>{copy.results.noneHint}</p>
          <Link href="/per-i-saloni" className={styles.link}>
            {copy.results.owner}
          </Link>
        </div>
      ) : null}

      {!ok || ok.hits.length === 0 ? (
        <section aria-labelledby="citta-t" className={styles.results}>
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
      <h1 className={styles.title}>{copy.results.headingEmpty}</h1>
      <SearchBox />
      <div className={styles.skeleton} aria-hidden="true" />
      <div className={styles.skeleton} aria-hidden="true" />
    </div>
  );
}
