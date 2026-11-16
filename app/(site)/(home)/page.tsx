import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { NearMeButton } from "@/components/search/NearMeButton";
import { SearchBox } from "@/components/search/SearchBox";
import { cx } from "@/components/ui/cx";
import styles from "@/components/search/Home.module.css";
import { searchCopy } from "@/lib/copy/search";
import { citySlug } from "@/lib/places/comuni";
import { clockLabel } from "@/lib/search/rules";
import { romeMinutes } from "@/lib/dates/rome";
import { cityStats, popularServices, recentSalons, type CityStat } from "@/lib/search/load";

const copy = searchCopy.home;

export const metadata: Metadata = {
  title: searchCopy.meta.homeTitle,
  description: searchCopy.meta.homeDescription,
  alternates: { canonical: "/" },
  openGraph: { title: searchCopy.meta.homeTitle, description: searchCopy.meta.homeDescription, type: "website", locale: "it_IT", siteName: "Taglendo", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Taglendo" }] },
  twitter: { card: "summary_large_image", title: searchCopy.meta.homeTitle, description: searchCopy.meta.homeDescription, images: ["/og.png"] },
};

/** Le città più grandi: sempre in elenco («Presto anche a»), anche prima che ci siano saloni. */
const BIG_CITIES = ["Roma", "Milano", "Napoli", "Torino", "Palermo", "Genova", "Bologna", "Firenze", "Bari", "Catania", "Venezia", "Verona", "Padova", "Salerno"] as const;
/** I riquadri delle città, nell'ordine dei colori del design. */
const CITY_TONES = ["Plum", "Peach", "White", "Cream"] as const;

const Svg = ({ size = 18, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const Arrow = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
const Check = () => (
  <Svg size={18}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

/** I saloni arrivati da poco: quattro schede, in ordine di arrivo (niente «consigliati»). */
async function Recent() {
  const salons = await recentSalons(4);
  if (salons.length === 0) return null;
  const mapCity = salons[0]?.city;
  return (
    <section className={styles.section} aria-labelledby="nuovi-t">
      <div className={styles.wrap}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.h2} id="nuovi-t">
              {copy.recentTitle}
            </h2>
            <p className={styles.sub}>{copy.recentLead}</p>
          </div>
          <Link href={mapCity ? `/cerca?dove=${encodeURIComponent(mapCity)}` : "/cerca"} className={styles.more}>
            {copy.recentAll}
          </Link>
        </div>
        <ul className={styles.rail}>
          {salons.map((s) => (
            <li key={s.slug}>
              <Link href={`/${s.slug}`} className={styles.salon}>
                <span className={styles.salonPhoto}>
                  {s.coverUrl ? (
                    <Image src={s.coverUrl} alt="" fill sizes="(min-width: 961px) 25vw, 70vw" />
                  ) : (
                    <span className={styles.salonNoPhoto} aria-hidden="true">
                      {s.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logoUrl} alt="" className={styles.salonLogo} />
                      ) : (
                        <span className={styles.salonInitial}>{Array.from(s.name)[0]}</span>
                      )}
                    </span>
                  )}
                  {s.barbers >= 2 ? <span className={styles.badge}>{copy.barbers(s.barbers)}</span> : null}
                  {s.firstToday ? (
                    <span className={styles.free}>
                      <span className={styles.freeDot} aria-hidden="true" />
                      {copy.freeToday(clockLabel(romeMinutes(new Date(s.firstToday))))}
                    </span>
                  ) : null}
                </span>
                <span className={styles.salonText}>
                  <b className={styles.salonName}>{s.name}</b>
                  {s.where ? <span className={styles.salonWhere}>{s.where}</span> : null}
                  {s.services.length > 0 ? <span className={styles.salonServices}>{s.services.join(" · ")}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** La barra di ricerca con i servizi più diffusi tra i saloni in elenco. */
async function HeroSearch() {
  const services = await popularServices();
  return <SearchBox services={services} tone="dark" labels={{ service: copy.box.service, where: copy.box.where, when: copy.box.when, placeholder: copy.box.placeholder }} />;
}

const cityNote = (c: CityStat) => (c.freeToday > 0 ? copy.cityToday(c.freeToday) : c.freeTomorrow > 0 ? copy.cityTomorrow : null);

/** Le città con barberie (quattro riquadri) e, sotto, quelle dove Taglendo arriva presto. */
async function Cities() {
  const stats = await cityStats(12);
  const shown = stats.slice(0, 4);
  const have = new Set(stats.map((c) => c.city.toLowerCase()));
  const soon = BIG_CITIES.filter((c) => !have.has(c.toLowerCase()));
  return (
    <>
      {shown.length > 0 ? (
        <ul className={styles.cityCards}>
          {shown.map((c, i) => {
            const note = cityNote(c);
            return (
              <li key={c.city}>
                <Link href={`/barbieri/${citySlug(c.city)}`} className={cx(styles.cityCard, styles[`city${CITY_TONES[i % 4]!}` as "cityPlum"])}>
                  <span className={styles.cityTop}>
                    <b className={styles.cityName}>{c.city}</b>
                    <span className={styles.cityArrow}>
                      <Arrow size={20} />
                    </span>
                  </span>
                  <span>
                    <b className={styles.cityCount}>{copy.cityCount(c.salons)}</b>
                    {note ? <span className={styles.cityNote}>{note}</span> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className={styles.soonHead}>
        <p className={styles.soonLabel}>{copy.soon}</p>
        <Link href="/per-i-saloni" className={styles.soonLink}>
          {copy.missing}
        </Link>
      </div>
      <ul className={styles.soon}>
        {soon.map((city) => (
          <li key={city}>
            <Link href={`/barbieri/${citySlug(city)}`} className={styles.soonCity} aria-label={copy.cityLink(city)}>
              {city}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Home per i clienti (ridisegno di novembre 2026): la ricerca su foto, i servizi, i saloni arrivati da poco,
 * tre passi, le città e un blocco per chi ha una barberia. Niente prezzi aggregati, niente «consigliati».
 */
export default function Page() {
  return (
    <>
      {/* 1 · Apertura: foto a tutta larghezza con velo, titolo, ricerca, tre rassicurazioni */}
      <section className={styles.hero} aria-labelledby="home-t" id="cerca" data-land-hero="">
        <Image src="/images/foto/poltrona.jpg" alt="" fill priority sizes="100vw" className={styles.heroBg} />
        <div className={styles.heroVeil} aria-hidden="true" />
        <div className={cx(styles.wrap, styles.heroInner)}>
          <h1 className={cx(styles.h1, styles.enter)} id="home-t" style={{ "--i": 0 } as React.CSSProperties}>
            {copy.title}
          </h1>
          <p className={cx(styles.heroLead, styles.enter)} style={{ "--i": 1 } as React.CSSProperties}>
            {copy.lead}
          </p>
          <div className={cx(styles.heroSearch, styles.enter)} style={{ "--i": 2 } as React.CSSProperties}>
            <Suspense fallback={<SearchBox tone="dark" labels={{ service: copy.box.service, where: copy.box.where, when: copy.box.when, placeholder: copy.box.placeholder }} />}>
              <HeroSearch />
            </Suspense>
          </div>
          <ul className={cx(styles.checks, styles.enter)} style={{ "--i": 3 } as React.CSSProperties}>
            {copy.checks.map((c) => (
              <li key={c}>
                <Check />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2 · Cosa ti facciamo oggi? Quattro servizi, senza prezzi */}
      <section className={styles.section} aria-labelledby="servizi-t">
        <div className={styles.wrap}>
          <div className={styles.head}>
            <h2 className={styles.h2} id="servizi-t">
              {copy.servicesTitle}
            </h2>
            <Link href="/cerca" className={styles.more}>
              {copy.servicesAll}
            </Link>
          </div>
          <ul className={styles.cats}>
            {copy.services.map((c) => (
              <li key={c.name}>
                <Link href={`/cerca?servizio=${encodeURIComponent(c.query)}`} className={styles.cat}>
                  <Image src={c.photo} alt="" fill sizes="(min-width: 1100px) 25vw, 50vw" style={{ objectPosition: c.pos }} />
                  <span className={styles.catLabel}>
                    <span className={styles.catName}>
                      {c.name}
                      <span className={styles.catNote}>{c.note}</span>
                    </span>
                    <span className={styles.catArrow}>
                      <Arrow size={18} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3 · Appena arrivate: in ordine di arrivo */}
      <Suspense fallback={null}>
        <Recent />
      </Suspense>

      {/* 4 · Prenotare è più semplice: foto e tre passi */}
      <section className={styles.easy} aria-labelledby="facile-t">
        <div className={styles.easyPhoto}>
          <Image src="/images/foto/barba.jpg" alt={copy.easyPhoto} fill sizes="(min-width: 961px) 50vw, 100vw" />
        </div>
        <div className={styles.easyText}>
          <h2 className={cx(styles.h2, styles.easyTitle)} id="facile-t">
            {copy.easyTitle}
          </h2>
          <ol className={styles.steps}>
            {copy.easy.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <b className={styles.stepTitle}>{s.title}</b>
                  <span className={styles.stepText}>{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5 · Barbieri per città */}
      <section className={styles.section} aria-labelledby="citta-t" id="citta">
        <div className={styles.wrap}>
          <div className={styles.head}>
            <div>
              <h2 className={styles.h2} id="citta-t">
                {copy.citiesTitle}
              </h2>
              <p className={styles.sub}>{copy.citiesLead}</p>
            </div>
            <NearMeButton className={styles.nearMe} />
          </div>
          <Suspense fallback={null}>
            <Cities />
          </Suspense>
        </div>
      </section>

      {/* 6 · Per chi ha una barberia: un blocco grande, con l'agenda vera in un telefono tagliato */}
      <section className={styles.salonSection} aria-labelledby="salone-t">
        <div className={styles.wrap}>
          <div className={styles.business}>
            <div className={styles.businessText}>
              <p className={styles.businessKicker}>
                <Image src="/brand/taglendo-icon.svg" alt="" width={28} height={28} />
                {copy.salonKicker}
              </p>
              <h2 className={cx(styles.h2, styles.businessTitle)} id="salone-t">
                {copy.salonTitle}
              </h2>
              <p className={styles.businessLead}>{copy.salonText}</p>
              <ul className={styles.businessChecks}>
                {copy.salonChecks.map((c) => (
                  <li key={c}>
                    <Check />
                    {c}
                  </li>
                ))}
              </ul>
              <div className={styles.businessCta}>
                <Link href="/registrati" className={styles.btnLight}>
                  {copy.salonTry}
                </Link>
                <Link href="/per-i-saloni#come" className={styles.btnGhost}>
                  {copy.salonHow}
                </Link>
              </div>
            </div>
            <div className={styles.businessArt} aria-hidden="true">
              <div className={styles.phone}>
                <div className={styles.phoneScreen}>
                  <Image src="/images/shot-agenda-p.jpg" alt="" width={900} height={1900} sizes="230px" />
                  <div className={styles.notice}>
                    <Image src="/brand/taglendo-icon.svg" alt="" width={28} height={28} />
                    <span>
                      <b>{copy.salonNotice}</b>
                      <span>{copy.salonNoticeWho}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
