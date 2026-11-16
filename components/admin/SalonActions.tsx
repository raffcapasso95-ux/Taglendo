"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addNote, extendTrial, type AdminResult } from "@/lib/admin/actions";
import { adminCopy } from "@/lib/copy/admin";
import { Icon } from "./Icons";
import styles from "./Admin.module.css";

const copy = adminCopy.actions;

/** Le azioni sul salone: ognuna dice com'è andata e aggiorna la scheda. */
export function SalonActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);
  const [days, setDays] = useState("15");
  const [note, setNote] = useState("");

  const run = (call: () => Promise<AdminResult>, done?: () => void) =>
    start(async () => {
      const r = await call();
      setResult(r);
      if (r.ok) {
        done?.();
        router.refresh();
      }
    });

  return (
    <div className={styles.panel}>
      <h2>{copy.trial} · {adminCopy.detail.sections.notes}</h2>
      {result ? (
        <p className={`${styles.status} ${result.ok ? "" : styles.statusErr}`} role={result.ok ? "status" : "alert"}>
          {result.ok ? result.message : result.error}
        </p>
      ) : null}

      <div className={styles.actionGroup}>
        <h3>{copy.trial}</h3>
        <div className={styles.field}>
          <label htmlFor="prova-giorni">{copy.daysLabel}</label>
          <select id="prova-giorni" className={styles.select} value={days} onChange={(e) => setDays(e.target.value)}>
            {[7, 15, 30, 60, 90].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.rowBtns}>
          <button type="button" className={`${styles.btn} ${styles.btnLine}`} disabled={pending} onClick={() => run(() => extendTrial(id, Number(days), ""))}>
            <Icon name="clock" />
            {copy.extend}
          </button>
        </div>
      </div>

      <div className={styles.actionGroup}>
        <h3>{adminCopy.detail.sections.notes}</h3>
        <div className={styles.field}>
          <label htmlFor="nota">{copy.noteLabel}</label>
          <textarea id="nota" className={styles.textarea} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className={styles.rowBtns}>
          <button type="button" className={`${styles.btn} ${styles.btnLine}`} disabled={pending || !note.trim()} onClick={() => run(() => addNote(id, note), () => setNote(""))}>
            <Icon name="note" />
            {copy.addNote}
          </button>
        </div>
      </div>
    </div>
  );
}
