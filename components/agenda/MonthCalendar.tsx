"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";
import { loadMonthMarks, type MonthMarks } from "@/lib/agenda/calendar";
import { addMonths, dayLabel, monthChip, monthGrid, monthOf, monthRange, monthTitle } from "@/lib/dates/calendar";
import styles from "./Calendar.module.css";

/** Quanti mesi si possono raggiungere con le scorciatoie, a partire da quello di oggi. */
const SHORTCUT_MONTHS = 7;

type Props = {
  /** `agenda` per guardare qualunque giorno; `book` per fissare: giorni chiusi e passati spenti, niente mesi passati. */
  mode: "agenda" | "book";
  selected: string | null;
  today: string;
  onSelect: (date: string) => void;
  /** Livello del titolo del mese: h3 nel pannello, h4 dentro «Nuovo appuntamento». */
  heading?: "h3" | "h4";
  /** Classe in più per la fila delle scorciatoie dei mesi. */
  monthsClassName?: string;
  /** Sulla pagina pubblica i giorni chiusi si ricavano dagli orari, senza chiedere nulla al server. */
  localMarks?: (month: string) => MonthMarks;
  /** L'ultimo giorno prenotabile: dopo, i giorni sono spenti. */
  maxDate?: string;
};

const WEEK = ["L", "M", "M", "G", "V", "S", "D"];

/** Calendario del mese nello stile Taglendo: puntino sui giorni con appuntamenti, tratteggio sui giorni chiusi. */
export function MonthCalendar({ mode, selected, today, onSelect, heading: Heading = "h3", monthsClassName, localMarks, maxDate }: Props) {
  const [view, setView] = useState(monthOf(selected ?? today));
  const [marks, setMarks] = useState<Record<string, MonthMarks>>({});
  const asked = useRef(new Set<string>());
  const gridRef = useRef<HTMLDivElement>(null);
  const todayMonth = monthOf(today);
  const book = mode === "book";

  // i segni del mese (chiuso, con appuntamenti) si chiedono una volta sola per mese
  useEffect(() => {
    if (localMarks || asked.current.has(view)) return;
    asked.current.add(view);
    loadMonthMarks(view)
      .then((m) => setMarks((prev) => ({ ...prev, [view]: m })))
      .catch(() => asked.current.delete(view));
  }, [view, localMarks]);

  // la scorciatoia del mese attivo resta in vista
  useEffect(() => {
    gridRef.current?.parentElement?.querySelector<HTMLElement>('[aria-pressed="true"][data-cal-goto]')?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [view]);

  const current = localMarks ? localMarks(view) : marks[view];
  const closed = new Set(current?.closed);
  const busy = new Set(current?.busy);
  const { lead, days } = monthGrid(view);

  return (
    <div className={styles.cal} data-cal-mode={mode}>
      <div className={styles.head}>
        <button type="button" className={styles.nav} aria-label="Mese precedente" disabled={book && view <= todayMonth} onClick={() => setView(addMonths(view, -1))}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <Heading className={styles.month} aria-live="polite">
          {monthTitle(view)}
        </Heading>
        <button type="button" className={styles.nav} aria-label="Mese successivo" onClick={() => setView(addMonths(view, 1))}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
      <div className={cx(styles.months, monthsClassName)} role="group" aria-label="Vai al mese">
        {monthRange(todayMonth, SHORTCUT_MONTHS).map((m) => (
          <button key={m} type="button" className={cx(styles.monthChip, m === view && styles.monthChipOn)} aria-pressed={m === view} data-cal-goto={m} onClick={() => setView(m)}>
            {monthChip(m)}
          </button>
        ))}
      </div>
      <div className={styles.grid} ref={gridRef}>
        {WEEK.map((w, i) => (
          <span key={i} className={styles.dow} aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} className={styles.blank} aria-hidden="true" />
        ))}
        {days.map((d) => {
          const isClosed = closed.has(d);
          const isBusy = busy.has(d);
          const past = d < today;
          const on = d === selected;
          return (
            <button
              key={d}
              type="button"
              className={cx(styles.day, d === today && styles.dayToday, isClosed && styles.dayClosed, past && styles.dayPast, on && styles.dayOn)}
              aria-label={`${dayLabel(d)}${isClosed ? ", chiuso" : ""}${isBusy ? ", con appuntamenti" : ""}`}
              aria-pressed={on}
              data-date={d}
              disabled={book && (isClosed || past || (maxDate != null && d > maxDate))}
              onClick={() => onSelect(d)}
            >
              <span className={styles.num}>{Number(d.slice(8, 10))}</span>
              {isBusy ? <span className={styles.dot} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <div className={styles.foot}>
        <span className={styles.legend}>
          <span className={styles.dot} aria-hidden="true" />
          con appuntamenti
        </span>
        <span className={styles.legend}>
          <span className={styles.closedMark} aria-hidden="true" />
          chiuso
        </span>
        <button
          type="button"
          className={styles.today}
          onClick={() => {
            setView(todayMonth);
            onSelect(today);
          }}
        >
          Oggi
        </button>
      </div>
    </div>
  );
}
