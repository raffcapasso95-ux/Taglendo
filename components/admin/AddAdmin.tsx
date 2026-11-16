"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addAdmin, type AdminResult } from "@/lib/admin/actions";
import { adminCopy } from "@/lib/copy/admin";
import { ActionDialog } from "./ActionDialog";
import { Icon } from "./Icons";
import styles from "./Admin.module.css";

const copy = adminCopy.users;

/** «Aggiungi amministratore»: dà l'accesso al gestionale a un account che esiste già. */
export function AddAdmin() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <>
      <button type="button" className={styles.btn} disabled={pending} onClick={() => setOpen(true)}>
        <Icon name="shield" />
        {copy.addAdmin}
      </button>
      <ActionDialog
        open={open}
        title={copy.addTitle}
        text={copy.addText}
        field={{ label: copy.addLabel, type: "email" }}
        confirm={copy.add}
        onClose={() => setOpen(false)}
        onConfirm={(email) => {
          setOpen(false);
          start(async () => {
            const r = await addAdmin(email);
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
