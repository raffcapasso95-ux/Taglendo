import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fragment, Suspense } from "react";
import { CityLinks } from "@/components/search/SearchPage";
import { SearchBox } from "@/components/search/SearchBox";
import { cx } from "@/components/ui/cx";
import land from "@/components/marketing/Land.module.css";
import styles from "@/components/search/Search.module.css";
import { searchCopy } from "@/lib/copy/search";
import { listedCities } from "@/lib/search/load";

const copy = searchCopy.home;

export const metadata: Metadata = {
  title: searchCopy.meta.homeTitle,
  description: searchCopy.meta.homeDescription,
  alternates: { canonical: "/" },
  openGraph: { title: searchCopy.meta.homeTitle, description: searchCopy.meta.homeDescription, type: "website", locale: "it_IT", siteName: "Taglendo", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Taglendo" }] },
  twitter: { card: "summary_large_image", title: searchCopy.meta.homeTitle, description: searchCopy.meta.homeDescription, images: ["/og.png"] },
};

/** Le parole del titolo entrano una dopo l'altra, come nella pagina per i saloni. */
function Words({ words, from }: { words: readonly string[]; from: number }) {
  return words.map((w, i) => (
    <Fragment key={w}>
      <span className={land.w} style={{ "--i": from + i } as React.CSSProperties}>
        {w}
      </span>{" "}
    </Fragment>
  ));
}

/** Le città con almeno un salone: arrivano dal database, il resto della pagina non le aspetta. */
async function Cities() {
  const cities = await listedCities();
  if (cities.length === 0) return null;
  return (
    <section className={land.section} aria-labelledby="citta-t">
      <div className={cx(land.wrap, styles.homeBlock)}>
        <h2 className={land.h2} id="citta-t">
          {copy.citiesTitle}
        </h2>
        <p className={land.p}>{copy.citiesLead}</p>
        <CityLinks cities={cities} />
      </div>
    </section>
  );
}

/** NUOVO · Home per i clienti: la ricerca dei saloni in primo piano, le città, come funziona, e la fascia per chi ha un salone. */
export default function Page() {
  return (
    <>
      <section className={cx(land.hero, styles.homeHero)} id="top" data-land-hero="">
        <Image src="/images/foto/hero.jpg" alt="" width={1600} height={2409} priority sizes="100vw" className={land.heroBg} />
        <div className={land.heroInner}>
          <div className={land.heroText}>
            <p className={cx(land.kicker, land.rise)} style={{ "--i": 0 } as React.CSSProperties}>
              {copy.kicker}
            </p>
            <h1 className={land.h1}>
              <span className={land.line}>
                <Words words={copy.title} from={1} />
              </span>
              <span className={land.line}>
                <span className={land.accent}>
                  <Words words={copy.accent} from={4} />
                </span>
                <span className={cx(land.accent, land.hl)}>
                  <Words words={copy.scribbled} from={5} />
                  <svg className={land.scribble} viewBox="0 0 200 18" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M3 12 C 40 4, 90 3, 130 7 S 185 13, 197 6" />
                  </svg>
                </span>
              </span>
            </h1>
            <p className={cx(land.lead, land.rise)} style={{ "--i": 7 } as React.CSSProperties}>
              {copy.lead}
            </p>
            <div className={cx(styles.homeSearch, land.rise)} style={{ "--i": 8 } as React.CSSProperties}>
              <SearchBox tone="dark" />
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <Cities />
      </Suspense>

      <section className={land.section} aria-labelledby="passi-t">
        <div className={cx(land.wrap, styles.homeBlock)}>
          <p className={land.eyebrow}>{copy.stepsKicker}</p>
          <h2 className={land.h2} id="passi-t">
            {copy.stepsTitle}
          </h2>
          <ol className={styles.homeSteps}>
            {copy.steps.map((s, i) => (
              <li key={s.title} className={styles.homeStep}>
                <span className={styles.homeStepNum} aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className={land.h3}>{s.title}</h3>
                <p className={land.p}>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={land.startSec} aria-labelledby="salone-t">
        <div className={land.wrap}>
          <div className={land.startCard}>
            <div className={land.startText}>
              <h2 className={land.startTitle} id="salone-t">
                {copy.salonTitle}
              </h2>
              <p className={land.startLead}>{copy.salonText}</p>
            </div>
            <div className={land.startCta}>
              <Link className={cx(land.btn, land.btnLight, land.startBtn)} href="/per-i-saloni">
                {copy.salonCta}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
