import Link from "next/link";
import { cx } from "@/components/ui/cx";
import { searchCopy } from "@/lib/copy/search";
import { romeDate } from "@/lib/dates/rome";
import { formatPrice } from "@/lib/dates/format";
import { citySlug } from "@/lib/places/comuni";
import type { CityCount, SalonHit, SearchResult } from "@/lib/search/load";
import { activeTags, clockLabel, dayPhrase, kmLabel, pinLabel, resetFilters, resultsTitle, searchHref, slotChips, type SearchFilters } from "@/lib/search/rules";
import { addDays } from "@/lib/dates/rome";
import { siteUrl } from "@/lib/site";
import { FilterBar, type Base } from "./FilterBar";
import { CollapsibleSearch } from "./CollapsibleSearch";
import { RememberSearch } from "./RememberSearch";
import { Results } from "./Results";
import { SearchBox } from "./SearchBox";
import type { SalonView } from "./types";
import styles from "./Cerca.module.css";

const copy = searchCopy;

export const toView = (h: SalonHit, now: Date, anywhere = false): SalonView => ({
  slug: h.slug,
  name: h.name,
  where: h.address || h.area || h.city || "",
  lat: h.lat,
  lng: h.lng,
  coverUrl: h.coverUrl,
  logoUrl: h.logoUrl,
  distance: anywhere ? "" : kmLabel(h.distanceKm),
  services: h.services.map((x) => ({ name: x.name, price: x.priceCents !== null ? formatPrice(x.priceCents) : null })),
  ...(({ day, chips }) => ({ slotDay: day, slots: chips }))(slotChips(h.nextSlots, now)),
  pin: h.nextSlots[0] ? pinLabel(h.nextSlots[0], now) : null,
  bookingOnline: h.bookingOnline,
  open: h.openNow,
  closes: h.openNow && h.closesMin !== null ? clockLabel(h.closesMin) : null,
  isNew: h.isNew,
  barbers: h.barbers,
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

/** Da dove si parte per cambiare i filtri: il luogo cercato, come sta nell'indirizzo. */
export function baseOf(result: SearchResult, typed: string): Base {
  if (result.kind !== "ok") return typed ? { dove: typed } : {};
  return result.near ? { lat: result.center.lat, lng: result.center.lng } : { dove: result.place ?? typed };
}

const hrefFor = (base: Base, f: SearchFilters) => searchHref({ ...base, ...f, servizio: f.service, data: f.date });

const weekdayDay = (date: string) => {
  const t = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(".", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** I dati strutturati per i motori di ricerca: l'elenco dei saloni e il percorso (Home › Barbieri › città). */
function structuredData(hits: SalonHit[], place: string) {
  const base = siteUrl().replace(/\/$/, "");
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: hits.slice(0, 10).map((h, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/${h.slug}`, name: h.name })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: copy.results.crumbHome, item: `${base}/` },
        { "@type": "ListItem", position: 2, name: copy.results.crumbBarbers, item: `${base}/cerca` },
        ...(place ? [{ "@type": "ListItem", position: 3, name: place }] : []),
      ],
    },
  ];
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** La pagina dei risultati, usata da /cerca e dalle pagine per città: fascia di ricerca, filtri, elenco e mappa. */
export function SearchPage({ result, cities, services, typed, filters }: { result: SearchResult; cities: CityCount[]; services: string[]; typed: string; filters: SearchFilters }) {
  const now = new Date();
  const today = romeDate(now);
  const ok = result.kind === "ok" ? result : null;
  const place = ok?.place ?? "";
  const base = baseOf(result, typed);
  const plainTitle = !ok ? copy.results.headingEmpty : resultsTitle({ place: ok.place, near: ok.near, service: filters.service, date: filters.date, today });
  // senza un luogo: «Barba in tutta Italia · Oggi»
  const title = ok?.anywhere ? plainTitle.replace(/^([^·]*?)(\s·|$)/, `$1 ${copy.results.everywhere}$2`) : plainTitle;
  const filtered = Boolean(filters.service || filters.date);
  const tags = activeTags(filters);
  const count = ok?.hits.length ?? 0;
  const searchBox = <SearchBox initial={ok?.near ? (place ? `${copy.results.nearYou} · ${place}` : copy.results.nearYou) : ok ? place : typed} near={ok?.near ? { lat: ok.center.lat, lng: ok.center.lng } : undefined} service={filters.service ?? ""} date={filters.date} services={services} compact submitLabel={copy.results.update} />;
  const others = cities.filter((c) => c.city !== place);
  // il riepilogo dice solo ciò che è stato scelto («Barba · Bologna · Domani»); senza scelte, il luogo
  const where = ok?.anywhere ? copy.results.anyWhere : ok?.near ? copy.results.nearYou : place || copy.results.anyWhere;
  const summaryParts = [filters.service, where, filters.date ? dayPhrase(filters.date, today) : null].filter((p): p is string => Boolean(p));

  return (
    <div className={styles.page}>
      <RememberSearch />
      {ok && ok.hits.length > 0 ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData(ok.hits, place) }} /> : null}
      <section className={styles.band} aria-label={copy.results.searchLabel}>
        <div className={styles.bandIn}>
          <div className={styles.titleBlock}>
            <p className={styles.crumb}>
              <Link href="/">{copy.results.crumbHome}</Link> · <Link href="/cerca">{copy.results.crumbBarbers}</Link>
              {place ? ` · ${place}` : ""}
            </p>
            <h1 className={styles.title}>{title}</h1>
          </div>
          <div className={styles.searchSlot}>
            {count > 0 ? (
              <CollapsibleSearch summary={summaryParts}>
                {searchBox}
              </CollapsibleSearch>
            ) : (
              searchBox
            )}
          </div>
          {ok ? <FilterBar base={base} filters={filters} count={count} /> : null}
          {ok ? (
            <nav className={styles.days} aria-label={copy.results.day}>
              <Link href={hrefFor(base, { ...filters, date: null })} className={cx(styles.dayTab, !filters.date && styles.dayTabOn)} aria-current={!filters.date ? "true" : undefined} scroll={false} replace>
                {copy.results.anyDay}
              </Link>
              {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d, i) => (
                <Link key={d} href={hrefFor(base, { ...filters, date: d })} className={cx(styles.dayTab, filters.date === d && styles.dayTabOn)} aria-current={filters.date === d ? "true" : undefined} scroll={false} replace>
                  {i === 0 ? copy.results.today : i === 1 ? copy.results.tomorrow : weekdayDay(d)}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </section>

      {result.kind === "none" && filtered ? (
        <div className={styles.plain}>
          <p className={styles.notice} role="status">
            {copy.results.needPlace}
          </p>
        </div>
      ) : null}

      {result.kind === "unknown" ? (
        <div className={styles.plain}>
          <p className={styles.notice} role="status">
            {copy.results.unknown(result.text)}
          </p>
        </div>
      ) : null}

      {ok && ok.hits.length > 0 ? (
        <Results
          salons={ok.hits.map((h) => toView(h, now, ok.anywhere))}
          center={ok.center}
          radiusKm={ok.radiusKm}
          near={ok.near}
          filters={filters}
          mapBar={summaryParts}
          footer={
            others.length > 0 ? (
              <section aria-labelledby="altre-citta" className={styles.otherCities}>
                <h2 id="altre-citta" className={styles.otherTitle}>
                  {copy.results.otherCities}
                </h2>
                <CityLinks cities={others} />
              </section>
            ) : null
          }
          summary={
            <>
              <p className={styles.summaryText}>
                <strong className={styles.num}>{ok.hits.length}</strong> {ok.anywhere ? copy.results.countAnywhere(ok.hits.length) : copy.results.count(ok.hits.length, ok.radiusKm)}
                {ok.widened ? ` · ${copy.results.wider(30, place || "te")}` : ""}
              </p>
              {ok.anywhere ? <p className={styles.hint}>{copy.results.needPlace}</p> : null}
              {tags.length > 0 ? (
                <ul className={styles.tags} aria-label={copy.filters.active}>
                  {tags.map((t) => (
                    <li key={t.id}>
                      <Link href={hrefFor(base, t.off)} className={styles.tag} aria-label={copy.filters.remove(t.label)} scroll={false} replace>
                        {t.label}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          }
        />
      ) : null}

      {ok && ok.hits.length === 0 ? (
        <div className={styles.plain}>
          {tags.length > 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>{copy.results.emptyFiltered}</p>
              <p className={styles.emptyText}>{copy.results.emptyFilteredHint}</p>
              <Link href={hrefFor(base, resetFilters(filters))} className={styles.btnLine} scroll={false} replace>
                {copy.results.resetFilters}
              </Link>
            </div>
          ) : (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>{filtered ? copy.results.noneFiltered(place || "te") : copy.results.none(place || "te")}</p>
              <p className={styles.emptyText}>{filtered ? copy.results.noneFilteredHint : copy.results.noneHint}</p>
              <Link href="/per-i-saloni" className={styles.link}>
                {copy.results.owner}
              </Link>
            </div>
          )}
        </div>
      ) : null}

      {(!ok || ok.hits.length === 0) && tags.length === 0 ? (
        <div className={styles.plain}>
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
        </div>
      ) : null}
    </div>
  );
}

/** Mentre arrivano i risultati: il titolo e il campo ci sono già, l'elenco è in attesa. */
export function SearchSkeleton() {
  return (
    <div className={styles.page} aria-busy="true">
      <section className={styles.band} aria-label={copy.results.searchLabel}>
        <div className={styles.bandIn}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{copy.results.headingEmpty}</h1>
          </div>
          <div className={styles.searchSlot}>
            <SearchBox services={[]} compact submitLabel={copy.results.update} />
          </div>
        </div>
      </section>
      <div className={styles.plain}>
        <div className={styles.skeleton} aria-hidden="true" />
        <div className={styles.skeleton} aria-hidden="true" />
      </div>
    </div>
  );
}
