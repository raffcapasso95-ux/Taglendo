"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { cx } from "@/components/ui/cx";
import { searchCopy } from "@/lib/copy/search";
import {
  BANDS,
  FILTER_LABEL,
  KMS,
  QUICK_FILTERS,
  SERVICE_KEYS,
  countFilters,
  isOn,
  resetFilters,
  searchHref,
  toggleFilter,
  withKm,
  type FilterKey,
  type SearchFilters,
} from "@/lib/search/rules";
import styles from "./Cerca.module.css";

const copy = searchCopy.filters;
export type Base = { dove?: string | null; lat?: number; lng?: number; zona?: boolean };

const SlidersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </svg>
);

/**
 * La barra dei filtri sotto la ricerca: pulsante «Filtri» con il numero dei filtri accesi, filtri rapidi e «Ordina».
 * I filtri stanno nell'indirizzo: ogni scelta ricarica i risultati e, ricaricando la pagina, restano.
 */
export function FilterBar({ base, filters, count }: { base: Base; filters: SearchFilters; count: number }) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const n = countFilters(filters);

  const go = (f: SearchFilters) => start(() => router.replace(searchHref({ ...base, ...f, servizio: f.service, data: f.date }), { scroll: false }));
  const toggle = (k: FilterKey) => go(toggleFilter(filters, k));

  // Esc e un clic fuori chiudono il pannello
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // una funzione e non un componente: altrimenti a ogni scelta i pulsanti si ricreano e il cursore si perde
  const chip = (k: FilterKey, sub?: string) => (
    <button key={k} type="button" className={cx(styles.chip, styles.press)} aria-pressed={isOn(filters, k)} onClick={() => toggle(k)}>
      {FILTER_LABEL[k]}
      {sub ? <span className={styles.bandSub}>{sub}</span> : null}
    </button>
  );

  return (
    <div className={styles.filters} aria-busy={pending || undefined}>
      <div className={styles.filterWrap} ref={wrap}>
        <button ref={button} type="button" className={cx(styles.chip, styles.filterBtn, styles.press)} aria-expanded={open} aria-controls={`${id}-panel`} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
          <SlidersIcon />
          {copy.button}
          {n > 0 ? (
            <span className={styles.count} aria-label={`${n} ${n === 1 ? "filtro attivo" : "filtri attivi"}`}>
              {n}
            </span>
          ) : null}
        </button>
        {open ? (
          <>
            <div className={styles.backdrop} aria-hidden="true" onClick={() => setOpen(false)} />
            <div id={`${id}-panel`} role="dialog" aria-label={copy.panelLabel} className={styles.panel}>
              <div className={styles.grid}>
                <fieldset className={styles.group}>
                  <legend>{copy.distance}</legend>
                  <div className={styles.seg}>
                    {KMS.map((k) => (
                      <button key={k} type="button" aria-pressed={filters.maxKm === k} onClick={() => go(withKm(filters, k))}>
                        {k} km
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className={styles.group}>
                  <legend>{copy.when}</legend>
                  <div className={styles.chips}>
                    {(["oggi", "aperto", "nuovi"] as const).map((k) => chip(k))}
                  </div>
                </fieldset>
                <fieldset className={styles.group}>
                  <legend>{copy.band}</legend>
                  <div className={styles.chips}>
                    {BANDS.map((k) => chip(k, copy.bandSub[k]))}
                  </div>
                </fieldset>
                <fieldset className={styles.group}>
                  <legend>{copy.service}</legend>
                  <div className={styles.chips}>
                    {SERVICE_KEYS.map((k) => chip(k))}
                  </div>
                </fieldset>
              </div>
              <div className={styles.panelFoot}>
                <button type="button" className={styles.reset} onClick={() => go(resetFilters(filters))} disabled={n === 0} aria-disabled={n === 0}>
                  {copy.reset}
                </button>
                <button type="button" className={cx(styles.show, styles.press)} onClick={() => setOpen(false)}>
                  {pending ? copy.searching : copy.show(count)}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <span className={styles.divider} aria-hidden="true" />
      <ul className={styles.quick} aria-label={copy.quickLabel}>
        {QUICK_FILTERS.map((k) => (
          <li key={k}>{chip(k)}</li>
        ))}
      </ul>

      <label className={styles.sortLabel}>
        {copy.sort}
        <select className={styles.sortSelect} value={filters.sort} onChange={(e) => go({ ...filters, sort: e.target.value === "first" ? "first" : "km" })}>
          <option value="km">{copy.sortKm}</option>
          <option value="first">{copy.sortFirst}</option>
        </select>
      </label>
    </div>
  );
}
