"use client";

import { offlineCopy as copy } from "@/lib/copy/offline";
import { useQueue } from "@/lib/offline/hooks";
import { formatMinutes } from "@/lib/rules/hours";
import styles from "./Offline.module.css";

/** I nuovi appuntamenti fatti senza rete per questo giorno: si vedono subito, segnati "In attesa di invio" (D1). */
export function PendingAppointments({ date }: { date: string }) {
  const rows = useQueue().flatMap((i) => (i.kind === "create" && !i.error && i.input.date === date ? [i] : []));
  if (rows.length === 0) return null;
  return (
    <section className={styles.pending} aria-label={copy.pendingTitle}>
      <h2 className={styles.pendingTitle}>{copy.pendingTitle}</h2>
      {rows.map((r) => (
        <div key={r.id} className={styles.pendingRow}>
          <span className={styles.pendingTime}>{formatMinutes(r.input.startMin)}</span>
          <span className={styles.pendingText}>
            <span className={styles.pendingName}>{r.label.client}</span>
            <span className={styles.pendingMeta}>{r.label.service}</span>
          </span>
          <span className={styles.pendingTag}>{copy.waiting}</span>
        </div>
      ))}
    </section>
  );
}
