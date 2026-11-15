"use client";

import { cx } from "./cx";
import { dayLabel } from "@/lib/dates/calendar";
import styles from "./DateButton.module.css";

/** «Dom 15 nov 2026»: abbastanza corto da stare in mezza finestra. */
const shortDay = (date: string) => {
  const t = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(/\./g, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

type Props = {
  label: string;
  /** `AAAA-MM-GG`. */
  value: string;
  open: boolean;
  onToggle: () => void;
  /** Id del calendario che il pulsante apre. */
  controls?: string;
};

/**
 * Il campo data dei moduli: mostra «Dom 15 novembre 2026» e apre il calendario di Taglendo (MonthCalendar),
 * al posto del selettore del browser. Il calendario lo mette chi usa il campo, sotto le date.
 */
export function DateButton({ label, value, open, onToggle, controls }: Props) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <button type="button" className={cx(styles.box, open && styles.boxOpen)} aria-expanded={open} aria-controls={controls} aria-label={`${label}: ${dayLabel(value)}`} onClick={onToggle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
          <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
        </svg>
        <span className={styles.text}>{shortDay(value)}</span>
      </button>
    </div>
  );
}
