"use client";

import Image from "next/image";
import { useState } from "react";
import { saloniCopy } from "@/lib/copy/saloni";
import styles from "./Saloni.module.css";

const copy = saloniCopy.notebook;

/** Il confronto trascinabile: sotto l'agenda vera, sopra un quaderno scritto a mano tagliato con clip-path. */
export function NotebookCompare() {
  const [cut, setCut] = useState(50);
  return (
    <div className={styles.compare}>
      <Image src="/images/shot-agenda-d.jpg" alt={copy.alt} fill sizes="(min-width: 1280px) 1184px, 100vw" className={styles.compareImg} />
      <div className={styles.notebookClip} style={{ clipPath: `inset(0 ${100 - cut}% 0 0)` }} aria-hidden="true">
        <div className={styles.notebook}>
          <span className={styles.margin} />
          {copy.lines.map((l, i) => (
            <p key={i} className={"head" in l ? styles.nbHead : styles.nbLine}>
              {"strike" in l ? (
                <>
                  <s>{l.strike}</s> {"note" in l ? <span className={styles.nbNote}>{l.note}</span> : l.plain}
                </>
              ) : (
                l.text
              )}
            </p>
          ))}
        </div>
      </div>
      <span className={styles.tagBefore}>{copy.before}</span>
      <span className={styles.tagAfter}>{copy.after}</span>
      <span className={styles.handle} style={{ left: `${cut}%` }} aria-hidden="true">
        <span className={styles.knob}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </span>
        <span className={styles.drag}>{copy.drag}</span>
      </span>
      <input type="range" min={0} max={100} value={cut} onChange={(e) => setCut(Number(e.target.value))} aria-label={copy.range} className={styles.range} />
    </div>
  );
}
