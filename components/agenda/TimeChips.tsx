"use client";

import { agendaCopy } from "@/lib/copy/agenda";
import { clock } from "@/lib/rules/agenda";
import type { SlotsResult } from "@/lib/agenda/actions";
import styles from "./Dialogs.module.css";

type Props = { result: SlotsResult | null; loading: boolean; selected: number | null; onSelect: (startMin: number) => void; label: string };

/** Gli orari del giorno: i liberi si scelgono, gli occupati sono barrati. */
export function TimeChips({ result, loading, selected, onSelect, label }: Props) {
  if (!result) return <p className={styles.hint}>{loading ? "…" : ""}</p>;
  if (result.closed) return <p className={styles.hint}>{agendaCopy.form.closed}</p>;
  if (!result.slots.some((s) => s.free)) return <p className={styles.hint}>{agendaCopy.form.noSlots}</p>;
  return (
    <>
      <p className={styles.hint}>
        {label} · {agendaCopy.form.busyHint}
      </p>
      <div className={styles.times} role="group" aria-label={label} aria-busy={loading}>
        {result.slots.map((s) => (
          <button
            key={s.startMin}
            type="button"
            disabled={!s.free}
            aria-pressed={selected === s.startMin}
            className={`${selected === s.startMin ? styles.chipOn : s.free ? styles.chip : styles.chipOff} ${styles.time}`}
            onClick={() => onSelect(s.startMin)}
          >
            {clock(s.startMin)}
          </button>
        ))}
      </div>
    </>
  );
}
