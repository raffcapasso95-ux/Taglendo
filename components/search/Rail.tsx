"use client";

import { useRef, type ReactNode } from "react";
import { searchCopy } from "@/lib/copy/search";
import styles from "./Home.module.css";

const Chevron = ({ flip = false }: { flip?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

/** Una fila che scorre di lato, con le frecce su computer (sul telefono si scorre col dito). */
export function Rail({ children }: { children: ReactNode }) {
  const list = useRef<HTMLUListElement>(null);
  const move = (dir: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <div className={styles.railWrap}>
      <button type="button" className={`${styles.railBtn} ${styles.railPrev}`} aria-label={searchCopy.home.railPrev} onClick={() => move(-1)}>
        <Chevron flip />
      </button>
      <ul ref={list} className={styles.rail}>
        {children}
      </ul>
      <button type="button" className={`${styles.railBtn} ${styles.railNext}`} aria-label={searchCopy.home.railNext} onClick={() => move(1)}>
        <Chevron />
      </button>
    </div>
  );
}
