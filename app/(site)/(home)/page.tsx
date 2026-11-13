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

/** NUOVO · Home per i clienti: la ricerca in primo piano, poi una pagina che accompagna (come i portali di prenotazione). */
export default function Page() {
  return (
    <>
      {/* 1 · Apertura: titolo e ricerca; a destra com'è una prenotazione */}
      <section className={styles.hero} aria-labelledby="home-t" id="cerca">
        <div className={cx(styles.wrap, styles.heroInner)}>
          <div className={styles.heroText}>
            <p className={cx(styles.kicker, styles.enter)} style={{ "--i": 0 } as React.CSSProperties}>
              {copy.kicker}
            </p>
            <h1 className={cx(styles.h1, styles.enter)} id="home-t" style={{ "--i": 1 } as React.CSSProperties}>
              {copy.title}{" "}
              <span className={styles.h1Accent}>
                {copy.titleAccent}
                <svg className={styles.scribble} viewBox="0 0 200 18" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M3 12 C 40 4, 90 3, 130 7 S 185 13, 197 6" />
                </svg>
              </span>
            </h1>
            <p className={cx(styles.heroLead, styles.enter)} style={{ "--i": 2 } as React.CSSProperties}>
              {copy.lead}
            </p>
          </div>

          <div className={cx(styles.heroArt, styles.enterArt)} aria-hidden="true">
            <div className={styles.photoMain}>
              <Image src="/images/foto/cambia-macchinetta.jpg" alt="" fill priority sizes="(min-width: 1024px) 380px, 70vw" />
            </div>
            {/* una scheda come quelle dell'elenco: servizio, prezzo, orari di oggi */}
            <div className={styles.preview}>
              <div className={styles.previewPhoto}>
                <Image src="/images/foto/cambia-taglio.jpg" alt="" fill sizes="96px" />
              </div>
              <div className={styles.previewBody}>
                <span className={styles.previewTitle}>{copy.previewTitle}</span>
                <span className={styles.previewMeta}>
                  {copy.previewMeta} · {copy.previewWhere}
                </span>
                <span className={styles.previewSlots}>
                  <span className={styles.previewDay}>{copy.previewDay}</span>
                  {copy.previewSlots.map((t, i) => (
                    <span key={t} className={cx(styles.previewSlot, i === 1 && styles.previewSlotOn)}>
                      {t}
                    </span>
                  ))}
                </span>
              </div>
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
          </div>

          <div className={cx(styles.heroSearch, styles.enter)} style={{ "--i": 3 } as React.CSSProperties}>
            <Suspense fallback={<SearchBox />}>
              <HeroSearch />
            </Suspense>
            <p className={styles.popular}>
              <span>{copy.popular}</span>
              {POPULAR.map((c) => (
                <Link key={c} href={`/barbieri/${citySlug(c)}`} className={styles.popularLink}>
                  {c}
                </Link>
              ))}
            </p>
          </div>
        </div>
      </section>

      {/* 2 · Quattro motivi, in una riga: si leggono senza fermarsi */}
      <section className={styles.trust} aria-label={copy.whyTitle}>
        <ul className={cx(styles.wrap, styles.trustList)}>
          {copy.trust.map((t, i) => (
            <li key={t.title} className={styles.trustItem}>
              <span className={styles.trustIcon}>{WHY_ICONS[i]}</span>
              <span>
                <strong className={styles.trustTitle}>{t.title}</strong>
                <span className={styles.trustText}>{t.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3 · Cosa ti serve? I servizi come riquadri */}
      <section className={styles.section} aria-labelledby="servizi-t">
        <div className={styles.wrap}>
          <div className={styles.head}>
            <div>
              <p className={styles.eyebrow}>{copy.categoriesKicker}</p>
              <h2 className={styles.h2} id="servizi-t">
                {copy.categoriesTitle}
              </h2>
              <p className={styles.lead}>{copy.categoriesLead}</p>
            </div>
          </div>
          <ul className={styles.categories}>
            {copy.categories.map((c, i) => (
              <li key={c.name}>
                <Link href={`/cerca?servizio=${encodeURIComponent(c.query)}`} className={styles.category}>
                  <span className={styles.categoryIcon}>{CATEGORY_ICONS[i]}</span>
                  <span className={styles.categoryName}>{c.name}</span>
                  <span className={styles.categoryNote}>{c.note}</span>
                  <span className={styles.categoryArrow} aria-hidden="true">
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4 · Nuovi su Taglendo */}
      <Suspense fallback={null}>
        <Recent />
      </Suspense>

      {/* 5 · Come funziona: fondo pesca, tre passi grandi e il telefono */}
      <section className={cx(styles.section, styles.sectionPeach)} aria-labelledby="passi-t">
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
                    {String(i + 1).padStart(2, "0")}
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

      {/* 6 · Una fascia fotografica: il perché, in una frase */}
      <section className={styles.band} aria-labelledby="fascia-t">
        <Image src="/images/foto/hero.jpg" alt="" fill sizes="100vw" className={styles.bandImg} />
        <div className={cx(styles.wrap, styles.bandInner)}>
          <h2 className={styles.bandTitle} id="fascia-t">
            {copy.bandTitle}
          </h2>
          <p className={styles.bandText}>{copy.bandText}</p>
          <a href="#cerca" className={styles.btnLight}>
            {copy.bandCta} <Arrow />
          </a>
        </div>
      </section>

      {/* 7 · Domande frequenti dei clienti */}
      <section className={styles.section} aria-labelledby="faq-t">
        <div className={cx(styles.wrap, styles.faqWrap)}>
          <div className={styles.faqHead}>
            <p className={styles.eyebrow}>{copy.faqKicker}</p>
            <h2 className={styles.h2} id="faq-t">
              {copy.faqTitle}
            </h2>
            <Link href="/per-i-saloni" className={styles.more}>
              {copy.faqOwnerLink} <Arrow />
            </Link>
          </div>
          <div className={styles.faq}>
            {copy.faq.map((f) => (
              <details key={f.q} className={styles.faqItem}>
                <summary className={styles.faqQ}>
                  {f.q}
                  <span className={styles.faqPlus} aria-hidden="true" />
                </summary>
                <p className={styles.faqA}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8 · Cerca per città */}
      <section className={cx(styles.section, styles.sectionMuted)} aria-labelledby="citta-t" id="citta">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>{copy.citiesTitle}</p>
          <h2 className={styles.h2} id="citta-t">
            {copy.citiesHeading}
          </h2>
          <p className={styles.lead}>{copy.citiesLead}</p>
          <Suspense fallback={null}>
            <Cities />
          </Suspense>
        </div>
      </section>

      {/* 9 · Hai un salone? */}
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
