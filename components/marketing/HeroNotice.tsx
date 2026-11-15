"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { saloniCopy } from "@/lib/copy/saloni";
import styles from "./Saloni.module.css";

const copy = saloniCopy.hero;

/** L'avviso «Nuova prenotazione online» sul telefono: compare e scompare ogni 3,2 secondi (fermo, e visibile, con movimento ridotto). */
export function HeroNotice() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setOn((v) => !v), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={styles.notice} data-on={on} role="status" aria-hidden={!on}>
      <Image src="/brand/taglendo-icon.svg" alt="" width={30} height={30} />
      <span>
        <b>{copy.notice}</b>
        <span>{copy.noticeWho}</span>
      </span>
    </div>
  );
}
