"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { saloniCopy } from "@/lib/copy/saloni";
import styles from "./Saloni.module.css";

const copy = saloniCopy.page;
const NATURAL = 1200;
/** Per ogni voce: gli elementi della pagina (dentro l'anteprima) che si evidenziano. */
const TARGETS = [["#intestazione"], ["#servizi"], ["#prenota-card"], ["#foto", "#barbieri"], ["#info", "#dove"]] as const;

type Box = { top: number; left: number; width: number; height: number };

/**
 * «La pagina della tua barberia»: a sinistra cinque voci, a destra una finestra del browser con la pagina del salone vera
 * (lo stesso componente, rimpicciolito con transform: scale). Scegliendo una voce l'anteprima scorre a quella parte e la
 * evidenzia con un riquadro albicocca (640 ms); le voci avanzano da sole ogni 4,2 s finché chi guarda non ne tocca una.
 * Sul telefono l'anteprima è alla larghezza del telefono e le voci sono un elenco.
 */
export function PagePreview({ children, host }: { children: ReactNode; host: string }) {
  const [i, setI] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [compact, setCompact] = useState(false);
  const [scale, setScale] = useState(0.54);
  const [box, setBox] = useState<Box | null>(null);
  const [offset, setOffset] = useState(0);
  const view = useRef<HTMLDivElement>(null);
  const scaler = useRef<HTMLDivElement>(null);
  const mover = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);

  // la misura: quanto è larga la finestra e se siamo su telefono
  useLayoutEffect(() => {
    const el = view.current;
    if (!el) return;
    const mq = window.matchMedia("(max-width: 960px)");
    const measure = () => {
      setCompact(mq.matches);
      setScale(mq.matches ? 1 : el.clientWidth / NATURAL);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, []);

  // dove sta la parte scelta, in pixel della pagina a grandezza naturale
  const place = useCallback(
    (index: number) => {
      const root = mover.current;
      const wrap = view.current;
      if (!root || !wrap || compact) return setBox(null);
      // si misura dal contenitore che scorre (non da quello fermo): così lo scorrimento già fatto non sposta le misure
      const base = root.getBoundingClientRect();
      const rects = TARGETS[index]!.flatMap((sel) => {
        const r = root.querySelector(sel)?.getBoundingClientRect();
        return r ? [r] : [];
      });
      if (rects.length === 0) return setBox(null);
      const top = Math.min(...rects.map((r) => r.top));
      const left = Math.min(...rects.map((r) => r.left));
      const right = Math.max(...rects.map((r) => r.right));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      const b = { top: (top - base.top) / scale, left: (left - base.left) / scale, width: (right - left) / scale, height: (bottom - top) / scale };
      setBox(b);
      const total = root.scrollHeight;
      const visible = wrap.clientHeight / scale;
      setOffset(Math.max(0, Math.min(b.top - 24, total - visible)));
    },
    [compact, scale],
  );

  useEffect(() => {
    // dopo che la pagina d'esempio è disegnata (font e immagini cambiano le altezze)
    const t = setTimeout(() => place(i), 60);
    return () => clearTimeout(t);
  }, [i, place]);

  // le voci avanzano da sole, finché non se ne tocca una
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current || stopped || compact) return;
    const t = setInterval(() => setI((v) => (v + 1) % copy.features.length), 4200);
    return () => clearInterval(t);
  }, [stopped, compact]);

  return (
    <div className={styles.pgrid}>
      <div className={styles.pfeat} role="tablist" aria-label={copy.tabs}>
        {copy.features.map((f, n) => (
          <button
            key={f.title}
            type="button"
            role="tab"
            aria-selected={i === n}
            className={cx(styles.pbtn, i === n && styles.pbtnOn)}
            onClick={() => {
              setStopped(true);
              setI(n);
            }}
          >
            <span className={styles.pn}>{n + 1}</span>
            <span>
              <b>{f.title}</b>
              <span className={styles.pd}>{f.text}</span>
            </span>
          </button>
        ))}
      </div>
      <div className={styles.pvCol}>
        <div className={styles.browser}>
          <div className={styles.bbar} aria-hidden="true">
            <span />
            <span />
            <span />
            <em>{host}/barberia-porta-nuova</em>
          </div>
          <div className={styles.pv} ref={view}>
            {/* è solo una vetrina: niente focus né lettori di schermo dentro la pagina d'esempio */}
            <div ref={scaler} className={styles.scaler} style={compact ? { width: "100%" } : { width: NATURAL, transform: `scale(${scale})` }} aria-hidden="true" inert>
              <div className={styles.mover} ref={mover} style={{ transform: `translateY(-${offset}px)` }}>
                {children}
                {box && !compact ? <span className={styles.hl} style={{ left: box.left, top: box.top, width: box.width, height: box.height }} /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
