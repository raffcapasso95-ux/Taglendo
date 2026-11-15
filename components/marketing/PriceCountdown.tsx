"use client";

import { useEffect, useRef, useState } from "react";
import { saloniCopy } from "@/lib/copy/saloni";
import styles from "./Saloni.module.css";

/** Il contatore che scende da 29 € a 0 €: parte quando la sezione è visibile (−1 ogni 40 ms); con movimento ridotto mostra subito 0. */
export function PriceCountdown() {
  const [n, setN] = useState(29);
  const box = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = box.current;
    // con movimento ridotto (o senza osservatore) il contatore mostra subito 0
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !el || !("IntersectionObserver" in window)) {
      const t = setTimeout(() => setN(0), 0);
      return () => clearTimeout(t);
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        timer = setInterval(() => setN((v) => (v <= 1 ? (clearInterval(timer), 0) : v - 1)), 40);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearInterval(timer);
    };
  }, []);
  return (
    <p ref={box} className={styles.bigNum}>
      <span aria-hidden="true">
        {n}
        <span className={styles.euro}>€</span>
      </span>
      <span className={styles.vh}>{saloniCopy.cost.zero}</span>
    </p>
  );
}
