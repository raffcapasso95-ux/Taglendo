"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { extendTrial, setHidden, setSuspended, type AdminResult } from "@/lib/admin/actions";
import { adminCopy } from "@/lib/copy/admin";
import { ActionDialog } from "./ActionDialog";
import { Icon } from "./Icons";
import styles from "./Admin.module.css";

const copy = adminCopy.actions;

/** Le azioni di tutti i giorni in cima alla scheda, ognuna con la sua icona; «Sospendi» sempre in vista. */
export function SalonActionBar({ id, name, hidden, suspended }: { id: string; name: string; hidden: boolean; suspended: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 4500);
    return () => clearTimeout(t);
  }, [result]);

  const run = (call: () => Promise<AdminResult>) =>
    start(async () => {
      const r = await call();
      setResult(r);
      if (r.ok) router.refresh();
    });

  return (
    <div className={styles.titleActions} role="group" aria-label={adminCopy.detail.sections.actions}>
      <button type="button" className={`${styles.btn} ${styles.btnLine}`} disabled={pending} onClick={() => run(() => setHidden(id, !hidden, ""))}>
        <Icon name={hidden ? "eye" : "eyeOff"} />
        {hidden ? copy.show : copy.hide}
      </button>
      <button type="button" className={`${styles.btn} ${styles.btnLine}`} disabled={pending} onClick={() => run(() => extendTrial(id, 7, ""))}>
        <Icon name="clock" />
        {adminCopy.rowMenu.extend7}
      </button>
      {suspended ? (
        <button type="button" className={styles.btn} disabled={pending} onClick={() => run(() => setSuspended(id, false, ""))}>
          <Icon name="play" />
          {copy.reactivate}
        </button>
      ) : (
        <button type="button" className={`${styles.btn} ${styles.btnLine} ${styles.btnWarn}`} disabled={pending} onClick={() => setAsking(true)}>
          <Icon name="pause" />
          {copy.suspend}
        </button>
      )}

      <ActionDialog
        open={asking}
        title={copy.suspend}
        text={`${adminCopy.rowMenu.suspendFor(name)} ${copy.suspendHint}`}
        field={{ label: copy.reasonLabel }}
        confirm={copy.confirm}
        tone="danger"
        onClose={() => setAsking(false)}
        onConfirm={(reason) => {
          setAsking(false);
          run(() => setSuspended(id, true, reason));
        }}
      />

      {result ? (
        <p className={`${styles.toast} ${result.ok ? "" : styles.toastErr}`} role={result.ok ? "status" : "alert"}>
          {result.ok ? result.message : result.error}
        </p>
      ) : null}
    </div>
  );
}
