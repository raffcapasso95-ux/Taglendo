"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Saloni.module.css";

/**
 * «Una giornata qualunque»: quando la striscia entra nello schermo la linea si disegna (900 ms) e i momenti compaiono in sequenza.
 * Senza JavaScript, o con movimento ridotto, si vede subito tutta.
 */
export function DayStrip({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);
  const [state, setState] = useState<"still" | "armed" | "in">("still");
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.some((e) => e.isIntersecting);
        setState(seen ? "in" : "armed");
        if (seen) io.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <ol ref={ref} className={styles.day} data-armed={state !== "still"} data-in={state === "in"}>
      {children}
    </ol>
  );
}
