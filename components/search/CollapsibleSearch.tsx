"use client";

import { useId, useState, type ReactNode } from "react";
import { searchCopy } from "@/lib/copy/search";
import styles from "./Cerca.module.css";

/**
 * Sul telefono i tre campi della ricerca occupano un terzo dello schermo prima di vedere un solo salone:
 * con i risultati sotto si riducono a una riga di riepilogo («Barba · Bologna · Domani») che, toccata, apre i campi.
 * Da computer i campi ci sono sempre e il riepilogo non si vede.
 */
export function CollapsibleSearch({ summary, children }: { summary: string[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={styles.collapse} data-open={open}>
      <button type="button" className={styles.summaryBtn} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span className={styles.summaryText2}>
          {summary.map((part, i) => (
            <span key={i}>{part}</span>
          ))}
        </span>
        <span className={styles.summaryEdit}>
          {open ? searchCopy.results.close : searchCopy.results.editSearch}
        </span>
      </button>
      <div id={id} className={styles.collapseBody}>
        {children}
      </div>
    </div>
  );
}
