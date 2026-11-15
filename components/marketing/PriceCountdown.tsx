"use client";

import { useEffect, useRef, useState } from "react";
import { saloniCopy } from "@/lib/copy/saloni";
import styles from "./Saloni.module.css";

/** Il contatore che scende da 29 € a 0 €: parte quando la sezione è visibile (−1 ogni 40 ms); con movimento ridotto mostra subito 0. */
export function PriceCountdown() {
  const [n, setN] = useState(29);
  const box = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(0);
      return;
    }
    const el = box.current;
    if (!el || !("IntersectionObserver" in window)) {
      setN(0);
      return;
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
    <p ref={box} className={styles.bigNum} aria-label={saloniCopy.cost.zero}>
      <span aria-hidden="true">
        {n}
        <span className={styles.euro}>€</span>
      </span>
    </p>
  );
}
