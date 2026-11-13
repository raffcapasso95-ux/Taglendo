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

const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
const MapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" />
    <path d="M9 4v13M15 6.5v13" />
  </svg>
);
const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </svg>
);

/** La foto del salone; senza foto un riquadro caldo con il logo o l'iniziale. */
function Photo({ salon }: { salon: SalonView }) {
  if (salon.coverUrl) {
    // la foto arriva dall'archivio del salone, come nella sua pagina: un'immagine semplice, caricata quando serve
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={salon.coverUrl} alt="" loading="lazy" decoding="async" className={styles.cardImg} />;
  }
  return (
    <span className={styles.cardNoPhoto} aria-hidden="true">
      {salon.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={salon.logoUrl} alt="" className={styles.cardLogo} />
      ) : (
        <span className={styles.cardInitial}>{salon.name.charAt(0)}</span>
      )}
    </span>
  );
}

/** Una scheda dell'elenco: foto, nome, zona e distanza, servizi con prezzo, prossimi orari, «Prenota». */
function SalonCard({ salon: s, active, onActive }: { salon: SalonView; active: boolean; onActive: (slug: string | null) => void }) {
  const href = `/${s.slug}`;
  return (
    <article
      className={cx(styles.card, active && styles.cardOn)}
      data-salon={s.slug}
      onMouseEnter={() => onActive(s.slug)}
      onMouseLeave={() => onActive(null)}
      aria-labelledby={`sal-${s.slug}`}
    >
      <Link href={href} className={styles.cardPhoto} tabIndex={-1} aria-hidden="true">
        <Photo salon={s} />
        {s.price ? <span className={styles.cardPriceTag}>{s.price}</span> : null}
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardName} id={`sal-${s.slug}`}>
            <Link href={href} className={styles.cardLink} onFocus={() => onActive(s.slug)} onBlur={() => onActive(null)}>
              {s.name}
            </Link>
          </h3>
          <p className={styles.cardWhere}>
            <PinIcon />
            <span>
              {s.where ? `${s.where} · ` : ""}
              <strong>{s.distance}</strong>
            </span>
          </p>
        </div>

        {s.services.length > 0 ? (
          <ul className={styles.cardServices} aria-label={copy.card.services}>
            {s.services.map((x) => (
              <li key={x.name} className={styles.cardService}>
                <span className={styles.cardServiceName}>{x.name}</span>
                <span className={styles.cardServiceMeta}>{x.duration}</span>
                {x.price ? <span className={styles.cardServicePrice}>{x.price}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}

        {s.slots.length > 0 ? (
          <div className={styles.cardSlots}>
            <span className={styles.cardSlotsDay}>{s.slotDay}</span>
            <ul className={styles.slotList} aria-label={copy.card.slotsLabel}>
              {s.slots.map((t) => (
                <li key={`${t.day ?? ""}${t.time}`}>
                  <Link href={href} className={styles.slot} aria-label={copy.card.slotAria(s.name, `${t.day ?? s.slotDay} ${t.time}`)}>
                    {t.day ? <span className={styles.slotDay}>{t.day}</span> : null}
                    {t.time}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={styles.cardNoSlot}>{s.bookingOnline ? copy.card.noSlot : copy.card.phoneOnly}</p>
        )}

        <div className={styles.cardFoot}>
          <Link href={href} className={styles.cardCta}>
            {s.bookingOnline ? copy.card.book : copy.card.see}
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * NUOVO: i risultati della ricerca, come nei portali di prenotazione.
 * Su computer elenco a sinistra e mappa a destra, alta quanto lo schermo (si può nascondere);
 * sul telefono l'elenco, con il pulsante «Mappa» che galleggia in basso.
 * Passando su un salone si accende la sua etichetta sulla mappa, e viceversa.
 */
export function Results({ salons, center, summary }: { salons: SalonView[]; center: { lat: number; lng: number }; summary: string }) {
  const [view, setView] = useState<"list" | "map">("list");
  const [mapHidden, setMapHidden] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className={cx(styles.results, mapHidden && styles.resultsNoMap)} data-view={view}>
      <div className={styles.listCol}>
        <div className={styles.toolbar}>
          <p className={styles.sub} role="status">
            {summary}
          </p>
          <button type="button" className={styles.mapToggle} onClick={() => setMapHidden(!mapHidden)} aria-pressed={!mapHidden}>
            <MapIcon />
            {mapHidden ? copy.results.showMap : copy.results.hideMap}
          </button>
        </div>
        <ol className={styles.list}>
          {salons.map((s) => (
            <li key={s.slug}>
              <SalonCard salon={s} active={active === s.slug} onActive={setActive} />
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.mapPane}>
        <SalonMap salons={salons} center={center} active={active} onPick={setActive} />
      </div>
      {/* sul telefono: passa da elenco a mappa, sempre a portata di pollice */}
      <button type="button" className={styles.floatSwitch} onClick={() => setView(view === "list" ? "map" : "list")}>
        {view === "list" ? <MapIcon /> : <ListIcon />}
        {view === "list" ? copy.results.map : copy.results.list}
      </button>
    </div>
  );
}
