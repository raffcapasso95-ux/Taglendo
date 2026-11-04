"use client";

import { addDays, dayNumber, isValidDate, weekdayShort } from "@/lib/dates/rome";
import { agendaCopy } from "@/lib/copy/agenda";
import styles from "./Dialogs.module.css";

type Props = { value: string; today: string; onChange: (date: string) => void; days?: number };

/** Giorni a portata di dito (14 da oggi) e, per gli altri, il selettore di data. */
export function DayPicker({ value, today, onChange, days = 14 }: Props) {
  const list = Array.from({ length: days }, (_, i) => addDays(today, i));
  return (
    <>
      <div className={styles.days} role="group" aria-label={agendaCopy.form.when}>
        {list.map((d) => (
          <button
            key={d}
            type="button"
            className={d === value ? styles.dayButtonOn : styles.dayButton}
            aria-pressed={d === value}
            aria-label={`${weekdayShort(d)} ${dayNumber(d)}`}
            onClick={() => onChange(d)}
          >
            <span className={styles.dayDow}>{weekdayShort(d)}</span>{" "}
            <span className={styles.dayNum}>{dayNumber(d)}</span>
          </button>
        ))}
      </div>
      <label className={styles.hint}>
        {agendaCopy.form.otherDay}{" "}
        <input
          type="date"
          className={styles.dateInput}
          min={today}
          value={value}
          onChange={(e) => {
            if (isValidDate(e.target.value) && e.target.value >= today) onChange(e.target.value);
          }}
        />
      </label>
    </>
  );
}
