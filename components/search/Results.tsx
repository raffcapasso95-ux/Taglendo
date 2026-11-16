"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { searchCopy } from "@/lib/copy/search";
import { pageNumbers, searchHref, type SearchFilters } from "@/lib/search/rules";
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
const GRID = "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z";

/** Quante schede per pagina: nell'elenco accanto alla mappa ce ne stanno meno che nella griglia. */
const PER_PAGE = { list: 8, grid: 12 } as const;
/** Quanti servizi si vedono nella scheda: gli altri sono nella pagina del salone. */
const SERVICES_SHOWN = 2;

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (n: number) => void }) {
  if (total <= 1) return null;
  return (
    <nav className={styles.pager} aria-label={copy.results.pager}>
      <button type="button" className={cx(styles.pageBtn, styles.press)} disabled={page === 1} onClick={() => onPage(page - 1)} aria-label={copy.results.prev}>
        <Svg size={18} d="m15 6-6 6 6 6" />
      </button>
      <ol className={styles.pages}>
        {pageNumbers(page, total).map((n, i) =>
          n === 0 ? (
            <li key={`gap${i}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>
              <button type="button" className={cx(styles.pageBtn, styles.press, styles.num)} aria-current={n === page ? "page" : undefined} aria-label={copy.results.page(n)} onClick={() => onPage(n)}>
                {n}
              </button>
            </li>
          ),
        )}
      </ol>
      <button type="button" className={cx(styles.pageBtn, styles.press)} disabled={page === total} onClick={() => onPage(page + 1)} aria-label={copy.results.next}>
        <Svg size={18} d="m9 6 6 6-6 6" />
      </button>
    </nav>
  );
}

/** La foto del salone; senza foto un riquadro caldo con il logo o l'iniziale. */
function Photo({ salon }: { salon: SalonView }) {
  if (salon.coverUrl) {
    // la foto arriva dall'archivio del salone, come nella sua pagina: un'immagine semplice, caricata quando serve
    return <Image src={salon.coverUrl} alt="" fill sizes="(max-width: 960px) 96px, 112px" />;
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

/**
 * Una scheda dell'elenco, a riga compatta: foto piccola, nome e distanza, aperto o chiuso, i servizi in una riga, gli orari liberi sotto.
 * Tutta la scheda è un tocco (il nome si estende su di lei); gli orari restano link a sé.
 */
function SalonCard({ salon: s, active, onActive, onMap }: { salon: SalonView; active: boolean; onActive: (slug: string | null) => void; onMap: (slug: string) => void }) {
  const href = `/${s.slug}`;
  const shown = s.services.slice(0, SERVICES_SHOWN);
  const more = s.services.length - shown.length;
  return (
    <article className={cx(styles.card, active && styles.cardOn)} data-salon={s.slug} onMouseEnter={() => onActive(s.slug)} onMouseLeave={() => onActive(null)} aria-labelledby={`sal-${s.slug}`}>
      <span className={styles.photo} aria-hidden="true">
        <Photo salon={s} />
        {s.isNew ? <span className={styles.badge}>{copy.card.newBadge}</span> : s.barbers >= 2 ? <span className={styles.badge}>{copy.card.barbers(s.barbers)}</span> : null}
      </span>
      <div className={styles.body}>
        <div className={styles.head}>
          <h3 className={styles.name} id={`sal-${s.slug}`}>
            <Link href={href} className={styles.cover} onFocus={() => onActive(s.slug)} onBlur={() => onActive(null)}>
              {s.name}
            </Link>
          </h3>
          {s.distance ? <span className={cx(styles.km, styles.num)}>{s.distance}</span> : null}
        </div>
        <p className={styles.status}>
          <Status s={s} />
        </p>
        {s.services.length > 0 ? (
          <ul className={styles.services} aria-label={copy.card.services}>
            {shown.map((x) => (
              <li key={x.name} className={styles.service}>
                {x.name}
                {x.price ? <b className={styles.num}>{x.price}</b> : null}
              </li>
            ))}
            {more > 0 ? <li className={styles.service}>+{more}</li> : null}
          </ul>
        ) : null}
      </div>
      <div className={styles.slotRow}>
        {s.slots.length > 0 ? (
          <>
            <ul className={styles.slots} aria-label={copy.card.slotsLabel}>
              {s.slots.slice(0, 3).map((t, i) => {
                const day = t.day ?? (i === 0 && s.slotDay && s.slotDay !== "Oggi" ? s.slotDay : null);
                return (
                  <li key={`${t.day ?? ""}${t.time}`}>
                    <Link href={href} className={cx(styles.slot, styles.num)} aria-label={copy.card.slotAria(s.name, `${day ?? s.slotDay} ${t.time}`)}>
                      {day ? (
                        <>
                          <span className={styles.slotDay}>{day}</span>{" "}
                        </>
                      ) : null}
                      {t.time}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href={href} className={cx(styles.slot, styles.slotMore)} aria-label={copy.card.see}>
              <Svg size={16} d="m9 6 6 6-6 6" />
            </Link>
          </>
        ) : (
          <p className={styles.noSlot}>{s.bookingOnline ? copy.card.noSlot : copy.card.phoneOnly}</p>
        )}
        <button type="button" className={cx(styles.slot, styles.slotMore, styles.onMap)} aria-label={copy.results.showOnMap} onClick={() => onMap(s.slug)}>
          <Svg size={18} d={PIN} />
        </button>
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
          <Image src={s.coverUrl} alt="" fill sizes="96px" />
        ) : (
          Array.from(s.name)[0]
        )}
      </Link>
      <div className={styles.selBody}>
        <h3 className={styles.selName}>{s.name}</h3>
        <div className={styles.selRow}>
          <Status s={s} />
          {s.distance ? (
            <span className={styles.km}>
              <Svg d={PIN} />
              <span className={styles.num}>{s.distance}</span>
            </span>
          ) : null}
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
  footer,
}: {
  salons: SalonView[];
  center: { lat: number; lng: number };
  radiusKm: number;
  near: boolean;
  filters: SearchFilters;
  summary: ReactNode;
  footer?: ReactNode;
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "map">("list");
  // su computer: elenco accanto alla mappa, oppure griglia a tutta larghezza
  const [mode, setMode] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zone, setZone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [seen, setSeen] = useState(salons);
  const [, start] = useTransition();

  // arrivati risultati nuovi: la scheda scelta si chiude e, se si era chiesta «questa zona», dice quante barberie ci sono
  if (seen !== salons) {
    setSeen(salons);
    setSelected(null);
    setPage(1);
    if (zone) {
      setZone(false);
      setToast(copy.map.zoneDone(salons.length));
    }
  }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  // se per qualche motivo non arriva niente, il pulsante torna com'era
  useEffect(() => {
    if (!zone) return;
    const t = setTimeout(() => setZone(false), 8000);
    return () => clearTimeout(t);
  }, [zone]);

  const searchZone = (c: { lat: number; lng: number }) => {
    setZone(true);
    start(() => router.replace(searchHref({ lat: c.lat, lng: c.lng, zona: true, ...filters, servizio: filters.service, data: filters.date }), { scroll: false }));
  };

  // «Mostra sulla mappa»: sul telefono passa alla mappa, con la scheda del salone aperta in basso
  const showOnMap = (slug: string) => {
    setSelected(slug);
    setView("map");
  };

  const pick = (slug: string | null) => {
    setSelected(slug);
    // sull'elenco, la scheda scelta si porta in vista
    if (slug) document.querySelector(`[data-salon="${CSS.escape(slug)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const chosen = salons.find((s) => s.slug === selected) ?? null;
  const perPage = PER_PAGE[mode];
  const pages = Math.max(1, Math.ceil(salons.length / perPage));
  const current = Math.min(page, pages);
  const shown = salons.slice((current - 1) * perPage, current * perPage);
  const goPage = (n: number) => {
    setPage(n);
    // si riparte dall'inizio dell'elenco
    document.querySelector("[data-list-col]")?.scrollTo({ top: 0, behavior: "smooth" });
    if (window.innerWidth <= 960) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const changeMode = (m: "list" | "grid") => {
    // la salone in vista resta più o meno al suo posto: si torna alla pagina che lo contiene
    const first = (current - 1) * perPage;
    setMode(m);
    setPage(Math.floor(first / PER_PAGE[m]) + 1);
  };

  return (
    <div className={styles.layout} data-view={view} data-mode={mode}>
      <div className={styles.listCol} data-list-col="">
        <div className={styles.summaryRow}>
          <div className={styles.summary} role="status">
            {summary}
          </div>
          <div className={styles.modes} role="group" aria-label={copy.results.view}>
            <button type="button" className={cx(styles.modeBtn, styles.press)} aria-pressed={mode === "list"} onClick={() => changeMode("list")}>
              <Svg size={16} d={LIST} />
              {copy.results.viewList}
            </button>
            <button type="button" className={cx(styles.modeBtn, styles.press)} aria-pressed={mode === "grid"} onClick={() => changeMode("grid")}>
              <Svg size={16} d={GRID} />
              {copy.results.viewGrid}
            </button>
          </div>
        </div>
        <ol className={styles.list}>
          {shown.map((s) => (
            <li key={s.slug}>
              <SalonCard salon={s} active={hovered === s.slug || selected === s.slug} onActive={setHovered} onMap={showOnMap} />
            </li>
          ))}
        </ol>
        <Pager page={current} total={pages} onPage={goPage} />
        {footer}
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
