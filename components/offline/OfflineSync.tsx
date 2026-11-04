"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createAppointment, setAppointmentStatus } from "@/lib/agenda/actions";
import { offlineCopy as copy } from "@/lib/copy/offline";
import { browserStore, useOnline, useQueue } from "@/lib/offline/hooks";
import { clearFailure, flushQueue, removeItem, SAVED_KEY } from "@/lib/offline/queue";
import styles from "./Offline.module.css";

const hhmm = (iso: string) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/**
 * La barra "Sei offline" (D1) e il motore della coda: appena torna la rete manda le modifiche fatte senza.
 * Sta nella cornice dell'app, così parte anche se nel frattempo si è cambiata pagina.
 */
export function OfflineSync() {
  const router = useRouter();
  const online = useOnline();
  const queue = useQueue();
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const running = useRef(false);

  const flush = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setSending(true);
    try {
      const result = await flushQueue(browserStore, {
        create: async (input) => {
          const r = await createAppointment(input);
          return r.ok ? { ok: true } : { ok: false, error: r.conflict ? r.conflict.title : r.error };
        },
        status: async (id, status) => {
          const r = await setAppointmentStatus(id, status);
          return r.ok ? { ok: true } : { ok: false, error: r.error };
        },
      });
      if (result.sent > 0) {
        setSentCount(result.sent);
        router.refresh();
        window.setTimeout(() => setSentCount(0), 4000);
      }
    } finally {
      running.current = false;
      setSending(false);
    }
  }, [router]);

  // Torna la rete (o si apre l'app online con la coda piena): si manda.
  const hasPending = queue.some((i) => !i.error);
  useEffect(() => {
    if (online && hasPending) {
      const t = window.setTimeout(flush, 0);
      return () => window.clearTimeout(t);
    }
  }, [online, hasPending, flush]);

  const failed = queue.filter((i) => i.error);
  const pending = queue.filter((i) => !i.error).length;
  let savedAt: string | null = null;
  if (!online) {
    try {
      const at = (JSON.parse(browserStore.getItem(SAVED_KEY) ?? "null") as { at?: string } | null)?.at;
      savedAt = at ? hhmm(at) : null;
    } catch {
      savedAt = null;
    }
  }

  if (online && !sending && sentCount === 0 && failed.length === 0) return null;

  return (
    <div className={online ? styles.barOnline : styles.bar} role="status" aria-live="polite" data-testid="offline-bar">
      {!online ? (
        <>
          <span className={styles.title}>{copy.title}</span>
          <span className={styles.text}>{copy.text(savedAt)}</span>
          {pending > 0 ? <span className={styles.badge}>{copy.pending(pending)}</span> : null}
        </>
      ) : sending ? (
        <span className={styles.title}>{copy.sending}</span>
      ) : sentCount > 0 ? (
        <span className={styles.title}>{copy.sent(sentCount)}</span>
      ) : null}
      {failed.map((item) => (
        <div key={item.id} className={styles.failed} role="alert">
          <span className={styles.text}>{copy.failed(item.label.client, item.label.service, item.error ?? copy.genericFail)}</span>
          <span className={styles.actions}>
            <button type="button" className={styles.link} onClick={() => { clearFailure(browserStore, item.id); flush(); }}>{copy.retry}</button>
            <button type="button" className={styles.link} onClick={() => removeItem(browserStore, item.id)}>{copy.discard}</button>
          </span>
        </div>
      ))}
    </div>
  );
}
