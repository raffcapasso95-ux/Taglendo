import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "@/components/search/SearchBox";
import { cx } from "@/components/ui/cx";
import styles from "@/components/search/Home.module.css";
import { searchCopy } from "@/lib/copy/search";
import { formatPrice } from "@/lib/dates/format";
import { citySlug } from "@/lib/places/comuni";
import { Rail } from "@/components/search/Rail";
import { listedCities, popularServices, recentSalons } from "@/lib/search/load";

const copy = searchCopy.home;

export const metadata: Metadata = {
  title: searchCopy.meta.homeTitle,
  description: searchCopy.meta.homeDescription,
  alternates: { canonical: "/" },
  openGraph: { title: searchCopy.meta.homeTitle, description: searchCopy.meta.homeDescription, type: "website", locale: "it_IT", siteName: "Taglendo", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Taglendo" }] },
  twitter: { card: "summary_large_image", title: searchCopy.meta.homeTitle, description: searchCopy.meta.homeDescription, images: ["/og.png"] },
};

/** Le città più grandi: sempre in elenco (per chi cerca e per Google), anche prima che ci siano saloni. */
const BIG_CITIES = ["Roma", "Milano", "Napoli", "Torino", "Palermo", "Genova", "Bologna", "Firenze", "Bari", "Catania", "Venezia", "Verona"] as const;

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const CATEGORY_ICONS = [
  <Icon key="taglio">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
  </Icon>,
  <Icon key="barba">
    <path d="M5 8c0 7 3.5 12 7 12s7-5 7-12" />
    <path d="M9 13.5c1 .7 2 1 3 1s2-.3 3-1M8 8h8" />
  </Icon>,
  <Icon key="completo">
    <path d="M12 3.5 14.5 9l6 .5-4.5 4 1.4 6L12 16.4 6.6 19.5 8 13.5l-4.5-4 6-.5z" />
  </Icon>,
  <Icon key="rasatura">
    <path d="M4 15 15 4l5 5L9 20H4z" />
    <path d="M12 7l5 5" />
  </Icon>,
  <Icon key="bambino">
    <circle cx="12" cy="9" r="4.5" />
    <path d="M10.5 9h.01M13.5 9h.01M10.5 11.2c.9.6 2.1.6 3 0M5 21c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5" />
  </Icon>,
  <Icon key="sfumatura">
    <path d="M4 18h16M4 14h12M4 10h8M4 6h4" />
  </Icon>,
];

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12 5 5 9-10" />
  </svg>
);

/** Gli ultimi saloni arrivati: schede con foto in una fila che scorre (come «Consigliati» dei grandi portali). */
async function Recent() {
  const salons = await recentSalons(8);
  if (salons.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="nuovi-t">
      <div className={styles.wrap}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.h2} id="nuovi-t">
              {copy.recentTitle}
            </h2>
            <p className={styles.lead}>{copy.recentLead}</p>
          </div>
          <Link href="/cerca" className={styles.more}>
            {copy.recentAll} <Arrow />
          </Link>
        </div>
        <Rail>
          {salons.map((s) => (
            <li key={s.slug} className={styles.railItem}>
              <Link href={`/${s.slug}`} className={styles.salon}>
                <span className={styles.salonPhoto}>
                  {s.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.coverUrl} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className={styles.salonNoPhoto} aria-hidden="true">
                      {s.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logoUrl} alt="" className={styles.salonLogo} />
                      ) : (
                        <span className={styles.salonInitial}>{s.name.charAt(0)}</span>
                      )}
                    </span>
                  )}
                </span>
                <span className={styles.salonName}>{s.name}</span>
                <span className={styles.salonMeta}>
                  {[s.where, s.priceFromCents !== null ? searchCopy.card.from(formatPrice(s.priceFromCents)) : null].filter(Boolean).join(" · ")}
                </span>
                {s.services.length > 0 ? <span className={styles.salonServices}>{s.services.join(" · ")}</span> : null}
              </Link>
            </li>
          ))}
        </Rail>
      </div>
    </section>
  );
}

/** La barra di ricerca con i servizi più diffusi tra i saloni in elenco. */
async function HeroSearch() {
  const services = await popularServices();
  return <SearchBox services={services} />;
}

/** Le città: le grandi sempre, più quelle dove ci sono già saloni (con il numero). */
async function Cities() {
  const listed = await listedCities();
  const counts = new Map(listed.map((c) => [c.city, c.salons]));
  const names = [...new Set([...listed.map((c) => c.city), ...BIG_CITIES])];
  names.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  return (
    <ul className={styles.cityLinks}>
      {names.map((city) => {
        const n = counts.get(city) ?? 0;
        return (
          <li key={city}>
            <Link href={`/barbieri/${citySlug(city)}`} className={styles.cityLink}>
              {copy.cityLink(city)}
              {n > 0 ? <span className={styles.cityCount}>{copy.citySalons(n)}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * NUOVO · Home per i clienti, corta come quelle dei portali di prenotazione:
 * la ricerca in apertura, poi i saloni, una fascia per chi ha un salone e le città.
 */
export default function Page() {
  return (
    <>
      {/* 1 · Apertura: titolo, ricerca, servizi a portata di tocco */}
      <section className={styles.hero} aria-labelledby="home-t" id="cerca">
        <div className={cx(styles.wrap, styles.heroInner)}>
          <h1 className={cx(styles.h1, styles.enter)} id="home-t" style={{ "--i": 0 } as React.CSSProperties}>
            {copy.title}{" "}
            <span className={styles.h1Accent}>
              {copy.titleAccent}
              <svg className={styles.scribble} viewBox="0 0 200 18" preserveAspectRatio="none" aria-hidden="true">
                <path d="M3 12 C 40 4, 90 3, 130 7 S 185 13, 197 6" />
              </svg>
            </span>
          </h1>
          <p className={cx(styles.heroLead, styles.enter)} style={{ "--i": 1 } as React.CSSProperties}>
            {copy.lead}
          </p>
          <div className={cx(styles.heroSearch, styles.enter)} style={{ "--i": 2 } as React.CSSProperties}>
            <Suspense fallback={<SearchBox />}>
              <HeroSearch />
            </Suspense>
          </div>
          <nav className={cx(styles.quick, styles.enter)} style={{ "--i": 3 } as React.CSSProperties} aria-label={copy.categoriesTitle}>
            {copy.categories.map((c, i) => (
              <Link key={c.name} href={`/cerca?servizio=${encodeURIComponent(c.query)}`} className={styles.quickLink}>
                <span className={styles.quickIcon}>{CATEGORY_ICONS[i]}</span>
                {c.name}
              </Link>
            ))}
          </nav>
          <ul className={cx(styles.trustLine, styles.enter)} style={{ "--i": 4 } as React.CSSProperties}>
            {copy.trust.map((t) => (
              <li key={t.title}>
                <Check />
                {t.title}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2 · I saloni: il contenuto della home */}
      <Suspense fallback={null}>
        <Recent />
      </Suspense>

      {/* 3 · Hai un salone? Una fascia sola */}
      <section className={styles.sectionTight} aria-labelledby="salone-t">
        <div className={styles.wrap}>
          <div className={styles.business}>
            <div className={styles.businessText}>
              <p className={cx(styles.eyebrow, styles.eyebrowLight)}>{copy.salonKicker}</p>
              <h2 className={cx(styles.h2, styles.businessTitle)} id="salone-t">
                {copy.salonTitle}
              </h2>
              <p className={styles.businessLead}>{copy.salonText}</p>
              <div className={styles.businessCta}>
                <Link href="/per-i-saloni" className={styles.btnLight}>
                  {copy.salonCta} <Arrow />
                </Link>
                <Link href="/registrati" className={styles.btnGhost}>
                  {copy.salonTry}
                </Link>
              </div>
            </div>
            <div className={styles.businessShot}>
              <Image src="/images/shot-agenda-desktop.png" alt={copy.salonAlt} width={2560} height={1640} sizes="(min-width: 1024px) 560px, 90vw" />
            </div>
          </div>
        </div>
      </section>

      {/* 4 · Le città: un elenco fitto di link, come in fondo ai portali */}
      <section className={styles.sectionTight} aria-labelledby="citta-t" id="citta">
        <div className={styles.wrap}>
          <h2 className={styles.h3} id="citta-t">
            {copy.citiesTitle}
          </h2>
          <Suspense fallback={null}>
            <Cities />
          </Suspense>
        </div>
      </section>
    </>
  );
}
