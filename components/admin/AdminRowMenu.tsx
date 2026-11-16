"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { removeAdmin, type AdminResult } from "@/lib/admin/actions";
import { adminCopy } from "@/lib/copy/admin";
import { ActionDialog } from "./ActionDialog";
import { Icon } from "./Icons";
import styles from "./Admin.module.css";

const copy = adminCopy.admins;

/** «Togli dagli amministratori», con la conferma. Non c'è per se stessi. */
export function AdminRowMenu({ userId, email, name }: { userId: string; email: string; name: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <>
      <button type="button" className={`${styles.btn} ${styles.btnLine} ${styles.btnWarn}`} aria-label={`${copy.remove}: ${name}`} disabled={pending} onClick={() => setAsking(true)}>
        <Icon name="shieldOff" />
        {copy.remove}
      </button>
      <ActionDialog
        open={asking}
        title={copy.removeTitle}
        text={copy.removeFor(email)}
        confirm={adminCopy.actions.confirm}
        tone="danger"
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          start(async () => {
            const r = await removeAdmin(userId);
            setMessage(r);
            if (r.ok) router.refresh();
          });
        }}
      />
      {message ? (
        <p className={`${styles.toast} ${message.ok ? "" : styles.toastErr}`} role={message.ok ? "status" : "alert"}>
          {message.ok ? message.message : message.error}
        </p>
      ) : null}
    </>
  );
}
