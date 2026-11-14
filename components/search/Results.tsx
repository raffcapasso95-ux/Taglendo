"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { searchCopy } from "@/lib/copy/search";
import { searchHref, type SearchFilters } from "@/lib/search/rules";
import type { SalonView } from "./types";
import styles from "./Cerca.module.css";

const copy = searchCopy;
// la mappa si carica solo nel browser (Leaflet usa `window`)
const SalonMap = dynamic(() => import("./SalonMap").then((m) => m.SalonMap), { ssr: false, loading: () => <div className={styles.mapLoading} aria-hidden="true" /> });

const Svg = ({ size = 16, d }: { size?: number; d: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const PIN = "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z";
const MAP = "M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4zM9 4v13M15 6.5v13";
const LIST = "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01";

/** La foto del salone; senza foto un riquadro caldo con il logo o l'iniziale. */
function Photo({ salon }: { salon: SalonView }) {
  if (salon.coverUrl) {
    // la foto arriva dall'archivio del salone, come nella sua pagina: un'immagine semplice, caricata quando serve
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={salon.coverUrl} alt="" loading="lazy" decoding="async" />;
  }
  return (
    <span className={styles.noPhoto} aria-hidden="true">
      {salon.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={salon.logoUrl} alt="" />
      ) : (
        <span className={styles.initial}>{Array.from(salon.name)[0]}</span>
      )}
    </span>
  );
}

const Status = ({ s }: { s: SalonView }) => (
  <span className={cx(styles.state, s.open && styles.stateOpen)}>
    <span className={styles.stateDot} aria-hidden="true" />
    {s.open && s.closes ? copy.card.open(s.closes) : copy.card.closed}
  </span>
);

/** Una scheda dell'elenco: foto, nome e distanza, aperto o chiuso, servizi con prezzo, orari liberi del giorno, «Vedi». */
function SalonCard({ salon: s, active, onActive }: { salon: SalonView; active: boolean; onActive: (slug: string | null) => void }) {
  const href = `/${s.slug}`;
  return (
    <article className={cx(styles.card, active && styles.cardOn)} data-salon={s.slug} onMouseEnter={() => onActive(s.slug)} onMouseLeave={() => onActive(null)} aria-labelledby={`sal-${s.slug}`}>
      <Link href={href} className={styles.photo} tabIndex={-1} aria-hidden="true">
        <Photo salon={s} />
        {s.isNew ? <span className={styles.badge}>{copy.card.newBadge}</span> : s.barbers >= 2 ? <span className={styles.badge}>{copy.card.barbers(s.barbers)}</span> : null}
      </Link>
      <div className={styles.body}>
        <div className={styles.head}>
          <h3 className={styles.name} id={`sal-${s.slug}`}>
            <Link href={href} onFocus={() => onActive(s.slug)} onBlur={() => onActive(null)}>
              {s.name}
            </Link>
          </h3>
          <span className={styles.km}>
            <Svg d={PIN} />
            <span className={styles.num}>{s.distance}</span>
          </span>
        </div>
        <p className={styles.status}>
          <Status s={s} />
          {s.where ? <span>{s.where}</span> : null}
        </p>
        {s.services.length > 0 ? (
          <ul className={styles.services} aria-label={copy.card.services}>
            {s.services.map((x) => (
              <li key={x.name} className={styles.service}>
                {x.name}
                {x.price ? <b className={styles.num}>{x.price}</b> : null}
              </li>
            ))}
          </ul>
        ) : null}
        <div className={styles.foot}>
          {s.slots.length > 0 ? (
            <>
              <span className={styles.day}>{s.slotDay}</span>
              <ul className={styles.slots} aria-label={copy.card.slotsLabel}>
                {s.slots.slice(0, 3).map((t) => (
                  <li key={`${t.day ?? ""}${t.time}`}>
                    <Link href={href} className={cx(styles.slot, styles.num)} aria-label={copy.card.slotAria(s.name, `${t.day ?? s.slotDay} ${t.time}`)}>
                      {t.day ? <span className={styles.slotDay}>{t.day}</span> : null}
                      {t.time}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.noSlot}>{s.bookingOnline ? copy.card.noSlot : copy.card.phoneOnly}</p>
          )}
          <Link href={href} className={styles.see}>
            {copy.card.view}
            <Svg size={16} d="m9 6 6 6-6 6" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** La scheda che si apre in basso sulla mappa quando si sceglie un salone. */
function MapCard({ salon: s, onClose }: { salon: SalonView; onClose: () => void }) {
  const href = `/${s.slug}`;
  return (
    <div className={styles.sel} role="group" aria-label={s.name}>
      <Link href={href} className={styles.selPhoto} tabIndex={-1} aria-hidden="true">
        {s.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.coverUrl} alt="" />
        ) : (
          Array.from(s.name)[0]
        )}
      </Link>
      <div className={styles.selBody}>
        <h3 className={styles.selName}>{s.name}</h3>
        <div className={styles.selRow}>
          <Status s={s} />
          <span className={styles.km}>
            <Svg d={PIN} />
            <span className={styles.num}>{s.distance}</span>
          </span>
        </div>
        {s.slots.length > 0 ? (
          <ul className={styles.slots} aria-label={copy.card.slotsLabel}>
            {s.slots.slice(0, 3).map((t) => (
              <li key={`${t.day ?? ""}${t.time}`}>
                <Link href={href} className={cx(styles.slot, styles.num)}>
                  {t.day ? <span className={styles.slotDay}>{t.day}</span> : null}
                  {t.time}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href={href} className={styles.selCta}>
          {copy.map.openPage}
        </Link>
      </div>
      <button type="button" className={styles.selX} aria-label={copy.map.closeCard} onClick={onClose}>
        <span>
          <Svg size={16} d="M6 6l12 12M18 6 6 18" />
        </span>
      </button>
    </div>
  );
}

/**
 * I risultati della ricerca: elenco a sinistra e mappa a destra (ferma sotto la testata mentre si scorre l'elenco);
 * sul telefono l'elenco, con il pulsante «Mappa» che galleggia in basso.
 * Passando su un salone si accende la sua etichetta sulla mappa, e viceversa; sceglierlo apre la sua scheda in basso.
 */
export function Results({
  salons,
  center,
  radiusKm,
  near,
  filters,
  summary,
}: {
  salons: SalonView[];
  center: { lat: number; lng: number };
  radiusKm: number;
  near: boolean;
  filters: SearchFilters;
  summary: ReactNode;
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "map">("list");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zone, setZone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const asked = useRef(false);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // arrivati i risultati della zona: «N barberie in questa zona»
  useEffect(() => {
    setSelected(null);
    if (!asked.current) return;
    asked.current = false;
    setZone(false);
    setToast(copy.map.zoneDone(salons.length));
    timers.current.push(setTimeout(() => setToast(null), 2600));
  }, [salons]);

  const searchZone = (c: { lat: number; lng: number }) => {
    asked.current = true;
    setZone(true);
    // se per qualche motivo non arriva niente, il pulsante torna com'era
    timers.current.push(
      setTimeout(() => {
        if (asked.current) {
          asked.current = false;
          setZone(false);
        }
      }, 8000),
    );
    start(() => router.replace(searchHref({ lat: c.lat, lng: c.lng, zona: true, ...filters, servizio: filters.service, data: filters.date }), { scroll: false }));
  };

  const pick = (slug: string | null) => {
    setSelected(slug);
    // sull'elenco, la scheda scelta si porta in vista
    if (slug) document.querySelector(`[data-salon="${CSS.escape(slug)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const chosen = salons.find((s) => s.slug === selected) ?? null;

  return (
    <div className={styles.layout} data-view={view}>
      <div className={styles.listCol}>
        <div className={styles.summary} role="status">
          {summary}
        </div>
        <ol className={styles.list}>
          {salons.map((s) => (
            <li key={s.slug}>
              <SalonCard salon={s} active={hovered === s.slug || selected === s.slug} onActive={setHovered} />
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.mapPane}>
        <SalonMap
          salons={salons}
          center={center}
          radiusKm={radiusKm}
          near={near}
          hovered={hovered}
          selected={selected}
          onHover={setHovered}
          onSelect={pick}
          onSearchZone={searchZone}
          searchingZone={zone}
          toast={toast}
        />
        {chosen ? <MapCard salon={chosen} onClose={() => setSelected(null)} /> : null}
      </div>
      {/* sul telefono: passa da elenco a mappa, sempre a portata di pollice */}
      <button type="button" className={cx(styles.floatSwitch, styles.press)} onClick={() => setView(view === "list" ? "map" : "list")}>
        <Svg size={18} d={view === "list" ? MAP : LIST} />
        {view === "list" ? copy.results.map : copy.results.list}
      </button>
    </div>
  );
}
