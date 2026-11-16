"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addNote, extendTrial, setHidden, setSuspended, type AdminResult } from "@/lib/admin/actions";
import { adminCopy } from "@/lib/copy/admin";
import styles from "./Admin.module.css";

const copy = adminCopy.actions;

/** Le azioni sul salone: ognuna dice com'è andata e aggiorna la scheda. */
export function SalonActions({ id, hidden, suspended }: { id: string; hidden: boolean; suspended: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
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
      <h2>{adminCopy.detail.sections.actions}</h2>
      {result ? (
        <p className={`${styles.status} ${result.ok ? "" : styles.statusErr}`} role={result.ok ? "status" : "alert"}>
          {result.ok ? result.message : result.error}
        </p>
      ) : null}

      <div className={styles.actionGroup}>
        <h3>{copy.visibility}</h3>
        <p className={`${styles.hint} ${styles.muted}`}>{copy.hideHint}</p>
        <div className={styles.rowBtns}>
          <button type="button" className={`${styles.btn} ${styles.btnLine}`} disabled={pending} onClick={() => run(() => setHidden(id, !hidden, ""))}>
            {hidden ? copy.show : copy.hide}
          </button>
        </div>
      </div>

      <div className={styles.actionGroup}>
        <h3>{copy.suspension}</h3>
        <p className={`${styles.hint} ${styles.muted}`}>{copy.suspendHint}</p>
        {suspended ? (
          <div className={styles.rowBtns}>
            <button type="button" className={styles.btn} disabled={pending} onClick={() => run(() => setSuspended(id, false, ""))}>
              {copy.reactivate}
            </button>
          </div>
        ) : (
          <>
            <div className={styles.field}>
              <label htmlFor="sosp-motivo">{copy.reasonLabel}</label>
              <textarea id="sosp-motivo" className={styles.textarea} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
            </div>
            {confirm ? (
              <div className={styles.rowBtns}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  disabled={pending}
                  onClick={() =>
                    run(() => setSuspended(id, true, reason), () => {
                      setConfirm(false);
                      setReason("");
                    })
                  }
                >
                  {copy.confirm}
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnLine}`} onClick={() => setConfirm(false)}>
                  {copy.cancel}
                </button>
              </div>
            ) : (
              <div className={styles.rowBtns}>
                <button type="button" className={`${styles.btn} ${styles.btnLine}`} disabled={pending || !reason.trim()} onClick={() => setConfirm(true)}>
                  {copy.suspend}
                </button>
              </div>
            )}
          </>
        )}
      </div>

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
            {copy.addNote}
          </button>
        </div>
      </div>
    </div>
  );
}
