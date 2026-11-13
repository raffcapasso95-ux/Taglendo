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
import { listedCities, recentSalons } from "@/lib/search/load";

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
const POPULAR = ["Napoli", "Milano", "Roma", "Torino", "Bologna"] as const;

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const WHY_ICONS = [
  <Icon key="0">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>,
  <Icon key="1">
    <path d="M12 3.5 4.5 6.5v5c0 4.4 3.1 8 7.5 9 4.4-1 7.5-4.6 7.5-9v-5L12 3.5z" />
    <path d="m8.8 12 2.2 2.2 4.2-4.4" />
  </Icon>,
  <Icon key="2">
    <path d="M6 9.5a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15.5 6 9.5z" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </Icon>,
  <Icon key="3">
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
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
        <ul className={styles.rail}>
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
        </ul>
      </div>
    </section>
  );
}

/** Le città: le grandi sempre, più quelle dove ci sono già saloni; il numero dove ce ne sono. */
async function Cities() {
  const listed = await listedCities();
  const counts = new Map(listed.map((c) => [c.city, c.salons]));
  const names = [...new Set([...listed.map((c) => c.city), ...BIG_CITIES])];
  // prima chi ha saloni (dal più fornito), poi le grandi città nell'ordine dato
  names.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  return (
    <ul className={styles.cityGrid}>
      {names.map((city) => {
        const n = counts.get(city) ?? 0;
        return (
          <li key={city}>
            <Link href={`/barbieri/${citySlug(city)}`} className={cx(styles.city, n > 0 && styles.cityOn)}>
              <span className={styles.cityName}>{copy.cityLink(city)}</span>
              {n > 0 ? <span className={styles.cityCount}>{copy.citySalons(n)}</span> : null}
              <Arrow />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** NUOVO · Home per i clienti: chiara, con la ricerca in primo piano (come i portali di prenotazione). */
export default function Page() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="home-t">
        <div className={cx(styles.wrap, styles.heroInner)}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>{copy.kicker}</p>
            <h1 className={styles.h1} id="home-t">
              {copy.title}{" "}
              <span className={styles.h1Accent}>
                {copy.titleAccent}
                <svg className={styles.scribble} viewBox="0 0 200 18" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 12 C 40 4, 90 3, 130 7 S 185 13, 197 6" />
                </svg>
              </span>
            </h1>
            <p className={styles.heroLead}>{copy.lead}</p>
            <div className={styles.heroSearch}>
              <SearchBox />
            </div>
            <p className={styles.popular}>
              <span>{copy.popular}</span>
              {POPULAR.map((c) => (
                <Link key={c} href={`/barbieri/${citySlug(c)}`} className={styles.popularLink}>
                  {c}
                </Link>
              ))}
            </p>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.photoMain}>
              <Image src="/images/foto/cambia-macchinetta.jpg" alt="" fill priority sizes="(min-width: 1024px) 360px, 66vw" />
            </div>
            <div className={styles.photoSide}>
              <Image src="/images/foto/cambia-taglio.jpg" alt="" fill sizes="(min-width: 1024px) 240px, 46vw" />
            </div>
            <div className={cx(styles.float, styles.floatBooked)}>
              <span className={styles.floatIcon}>
                <Check />
              </span>
              <span>
                <strong>{copy.floatBooked}</strong>
                <span>{copy.floatBookedText}</span>
              </span>
            </div>
            <div className={cx(styles.float, styles.floatFree)}>{copy.floatFree}</div>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <Recent />
      </Suspense>

      <section className={cx(styles.section, styles.sectionMuted)} aria-labelledby="perche-t">
        <div className={styles.wrap}>
          <h2 className={cx(styles.h2, styles.center)} id="perche-t">
            {copy.whyTitle}
          </h2>
          <ul className={styles.why}>
            {copy.why.map((w, i) => (
              <li key={w.title} className={styles.whyItem}>
                <span className={styles.whyIcon}>{WHY_ICONS[i]}</span>
                <h3 className={styles.h3}>{w.title}</h3>
                <p className={styles.text}>{w.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="passi-t">
        <div className={cx(styles.wrap, styles.steps)}>
          <div className={styles.stepsText}>
            <p className={styles.eyebrow}>{copy.stepsKicker}</p>
            <h2 className={styles.h2} id="passi-t">
              {copy.stepsTitle}
            </h2>
            <ol className={styles.stepList}>
              {copy.steps.map((s, i) => (
                <li key={s.title} className={styles.step}>
                  <span className={styles.stepNum} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>
                    <h3 className={styles.h3}>{s.title}</h3>
                    <p className={styles.text}>{s.text}</p>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className={styles.stepsShot}>
            <Image src="/images/shot-prenota-mobile.png" alt={copy.stepsAlt} width={780} height={1688} sizes="(min-width: 1024px) 300px, 60vw" />
          </div>
        </div>
      </section>

      <section className={cx(styles.section, styles.sectionMuted)} aria-labelledby="citta-t" id="citta">
        <div className={styles.wrap}>
          <h2 className={styles.h2} id="citta-t">
            {copy.citiesTitle}
          </h2>
          <p className={styles.lead}>{copy.citiesLead}</p>
          <Suspense fallback={null}>
            <Cities />
          </Suspense>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="salone-t">
        <div className={styles.wrap}>
          <div className={styles.business}>
            <div className={styles.businessText}>
              <p className={cx(styles.eyebrow, styles.eyebrowLight)}>{copy.salonKicker}</p>
              <h2 className={cx(styles.h2, styles.businessTitle)} id="salone-t">
                {copy.salonTitle}
              </h2>
              <p className={styles.businessLead}>{copy.salonText}</p>
              <ul className={styles.checks}>
                {copy.salonChecks.map((c) => (
                  <li key={c}>
                    <Check />
                    {c}
                  </li>
                ))}
              </ul>
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
    </>
  );
}
