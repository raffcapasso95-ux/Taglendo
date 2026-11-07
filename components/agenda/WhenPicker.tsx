"use client";

import { useMemo, useState } from "react";
import { cx } from "@/components/ui/cx";
import { agendaCopy } from "@/lib/copy/agenda";
import type { SlotsResult } from "@/lib/agenda/actions";
import { addDays, dayNumber, monthShort, weekdayShort } from "@/lib/dates/rome";
import { clock } from "@/lib/rules/agenda";
import { MonthCalendar } from "./MonthCalendar";
import dialogs from "./Dialogs.module.css";
import styles from "./Flow.module.css";

const flow = agendaCopy.flow;
/** Quanti giorni a portata di dito, da oggi. */
const DAYS_SHOWN = 14;
/** Mattina e pomeriggio si dividono alle 13. */
const NOON = 13 * 60;

type Props = {
  today: string;
  date: string;
  onDate: (date: string) => void;
  /** Giorni di chiusura del salone: nella fila dei giorni sono spenti. */
  closedDates: string[];
  startMin: number | null;
  onTime: (startMin: number) => void;
  /** Gli orari del giorno scelto (null finché non sono arrivati). */
  shown: SlotsResult | null;
  loading: boolean;
  /** La frase sopra gli orari: dice anche quando mancano o il giorno è chiuso. */
  hint: string;
};

/** Il «Quando» della schermata: fila di giorni, calendario dei mesi e orari liberi divisi in mattina e pomeriggio. */
export function WhenPicker({ today, date, onDate, closedDates, startMin, onTime, shown, loading, hint }: Props) {
  const [calOpen, setCalOpen] = useState(false);
  const closed = useMemo(() => new Set(closedDates), [closedDates]);
  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i)), [today]);
  const outside = !days.includes(date);
  const timeGroups = [
    { title: flow.morning, slots: shown?.slots.filter((x) => x.startMin < NOON) ?? [] },
    { title: flow.afternoon, slots: shown?.slots.filter((x) => x.startMin >= NOON) ?? [] },
  ].filter((g) => g.slots.length > 0);

  return (
    <>
      <div className={dialogs.whenDays}>
        <button
          type="button"
          className={cx(dialogs.calButton, styles.Dialogs_calButton, (calOpen || outside) && dialogs.calButtonOn, (calOpen || outside) && styles.Dialogs_calButtonOn)}
          aria-label={flow.openCalendar}
          aria-expanded={calOpen}
          onClick={() => setCalOpen(!calOpen)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15" rx="3" />
            <path d="M8 3v4M16 3v4M3.5 10h17" />
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
          </svg>
          {outside ? <span className={dialogs.calButtonDate}>{`${dayNumber(date)} ${monthShort(date)}`}</span> : null}
        </button>
        <div className={cx(dialogs.days, styles.Dialogs_days)} role="group" aria-label={flow.day}>
          {days.map((d) => {
            const on = d === date;
            return (
              <button
                key={d}
                type="button"
                className={cx(on ? dialogs.dayButtonOn : dialogs.dayButton, on ? styles.Dialogs_dayButtonOn : styles.Dialogs_dayButton)}
                aria-pressed={on}
                aria-label={`${weekdayShort(d)} ${dayNumber(d)}`}
                disabled={closed.has(d)}
                onClick={() => {
                  onDate(d);
                  setCalOpen(false);
                }}
              >
                <span className={cx(dialogs.dayDow, styles.Dialogs_dayDow)}>{weekdayShort(d)}</span>{" "}
                <span className={cx(dialogs.dayNum, styles.Dialogs_dayNum)}>{dayNumber(d)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className={cx(dialogs.whenCal, styles.Dialogs_whenCal)} hidden={!calOpen}>
        {calOpen ? (
          <MonthCalendar
            mode="book"
            heading="h4"
            monthsClassName={dialogs.Calendar_months}
            selected={date}
            today={today}
            onSelect={(d) => {
              onDate(d);
              setCalOpen(false);
            }}
          />
        ) : null}
      </div>
      <div className={cx(dialogs.whenTimes, styles.Dialogs_whenTimes)} hidden={calOpen}>
        <p className={cx(dialogs.hint, styles.Dialogs_hint)} aria-live="polite">
          {hint}
        </p>
        {timeGroups.map((g) => (
          <div key={g.title} className={cx(dialogs.timeGroup, styles.Dialogs_timeGroup)}>
            <p className={cx(dialogs.timeGroupTitle, styles.Dialogs_timeGroupTitle)}>{g.title}</p>
            <div className={cx(dialogs.times, styles.Dialogs_times)} role="group" aria-label={g.title} aria-busy={loading}>
              {g.slots.map((x) => (
                <button
                  key={x.startMin}
                  type="button"
                  disabled={!x.free}
                  aria-pressed={startMin === x.startMin}
                  className={cx(startMin === x.startMin ? dialogs.chipOn : x.free ? dialogs.chip : dialogs.chipOff, dialogs.time, styles.Dialogs_time, startMin === x.startMin && styles.Dialogs_chipOn, startMin !== x.startMin && !x.free && styles.Dialogs_chipOff, startMin !== x.startMin && x.free && styles.Dialogs_chip)}
                  onClick={() => onTime(x.startMin)}
                >
                  {clock(x.startMin)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
