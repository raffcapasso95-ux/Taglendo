"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Saloni.module.css";

const NATURAL = 1440;

/**
 * Una finestra con dentro la pagina del salone a grandezza naturale, rimpicciolita per starci (transform: scale).
 * Sul telefono la pagina è alla larghezza del telefono. È solo una vetrina: niente focus né lettori di schermo.
 */
export function ScaledFrame({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ compact: false, scale: 0.42 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const mq = window.matchMedia("(max-width: 960px)");
    const measure = () => setView(mq.matches ? { compact: true, scale: 0.84 } : { compact: false, scale: el.clientWidth / NATURAL });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, []);
  return (
    <div ref={box} className={styles.miniShot}>
      <div className={styles.miniInner} style={{ width: view.compact ? 390 : NATURAL, transform: `scale(${view.scale})` }} aria-hidden="true" inert>
        {children}
      </div>
    </div>
  );
}
