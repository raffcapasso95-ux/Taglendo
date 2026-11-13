"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { cx } from "@/components/ui/cx";
import { searchCopy } from "@/lib/copy/search";
import type { SalonView } from "./types";
import styles from "./Search.module.css";

const copy = searchCopy;
// la mappa si carica solo nel browser (Leaflet usa `window`)
const SalonMap = dynamic(() => import("./SalonMap").then((m) => m.SalonMap), { ssr: false, loading: () => <div className={styles.mapLoading} aria-hidden="true" /> });

/**
 * NUOVO: i risultati della ricerca. Su computer elenco a sinistra e mappa a destra; sul telefono si passa da «Elenco» a «Mappa».
 * Passando su un salone si accende il suo segnaposto, e toccando un segnaposto si evidenzia il salone.
 */
export function Results({ salons, center }: { salons: SalonView[]; center: { lat: number; lng: number } }) {
  const [view, setView] = useState<"list" | "map">("list");
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className={styles.results} data-view={view}>
      <div className={styles.viewSwitch} role="group" aria-label={copy.results.view}>
        {(["list", "map"] as const).map((v) => (
          <button key={v} type="button" className={cx(styles.viewButton, view === v && styles.viewButtonOn)} aria-pressed={view === v} onClick={() => setView(v)}>
            {v === "list" ? copy.results.list : copy.results.map}
          </button>
        ))}
      </div>
      <ol className={styles.list}>
        {salons.map((s, i) => (
          <li key={s.slug}>
            <Link
              href={`/${s.slug}`}
              className={cx(styles.card, active === s.slug && styles.cardOn)}
              data-salon={s.slug}
              onMouseEnter={() => setActive(s.slug)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.slug)}
              onBlur={() => setActive(null)}
            >
              <span className={styles.cardPhoto}>
                {s.coverUrl ? (
                  // la foto arriva dall'archivio del salone, come nella sua pagina: un'immagine semplice, caricata quando serve
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.coverUrl} alt="" loading="lazy" decoding="async" className={styles.cardImg} />
                ) : (
                  <span className={styles.cardNoPhoto} aria-hidden="true">
                    {s.name.charAt(0)}
                  </span>
                )}
                <span className={styles.cardNum} aria-hidden="true">
                  {i + 1}
                </span>
              </span>
              <span className={styles.cardBody}>
                <span className={styles.cardTop}>
                  <span className={styles.cardName}>{s.name}</span>
                  <span className={styles.cardDistance}>{s.distance}</span>
                </span>
                <span className={styles.cardWhere}>{s.where}</span>
                {s.services.length > 0 ? (
                  <span className={styles.cardServices}>
                    {s.services.join(" · ")}
                    {s.price ? <strong className={styles.cardPrice}> · {s.price}</strong> : null}
                  </span>
                ) : null}
                <span className={styles.cardFoot}>
                  <span className={cx(styles.cardSlot, !s.slot && styles.cardSlotOff)}>{s.slot ?? (s.bookingOnline ? copy.card.noSlot : copy.card.phoneOnly)}</span>
                  <span className={styles.cardCta}>{s.bookingOnline ? copy.card.book : copy.card.see}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <div className={styles.mapPane}>
        <SalonMap salons={salons} center={center} active={active} onPick={setActive} />
      </div>
    </div>
  );
}
