"use client";

import { useEffect, useId, useRef, useState } from "react";
import { adminCopy } from "@/lib/copy/admin";
import styles from "./Admin.module.css";

type Props = {
  open: boolean;
  title: string;
  text?: string;
  /** Un campo da riempire prima di confermare (motivo, email…). */
  field?: { label: string; type?: "textarea" | "email"; max?: number };
  confirm: string;
  tone?: "danger" | "plain";
  onConfirm: (value: string) => void;
  onClose: () => void;
};

/** La finestra di conferma delle azioni delicate: dice cosa succede e, se serve, chiede il motivo. */
export function ActionDialog({ open, title, text, field, confirm, tone = "plain", onConfirm, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [value, setValue] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setValue("");
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={`${id}-t`} onClose={onClose}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(value);
        }}
      >
        <h2 id={`${id}-t`}>{title}</h2>
        {text ? <p className={styles.muted}>{text}</p> : null}
        {field ? (
          <div className={styles.field}>
            <label htmlFor={`${id}-f`}>{field.label}</label>
            {field.type === "email" ? (
              <input id={`${id}-f`} type="email" className={styles.input} value={value} required autoComplete="off" onChange={(e) => setValue(e.target.value)} />
            ) : (
              <textarea id={`${id}-f`} className={styles.textarea} value={value} maxLength={field.max ?? 300} required onChange={(e) => setValue(e.target.value)} />
            )}
          </div>
        ) : null}
        <div className={styles.rowBtns}>
          <button type="submit" className={`${styles.btn} ${tone === "danger" ? styles.btnDanger : ""}`} disabled={Boolean(field) && !value.trim()}>
            {confirm}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnLine}`} onClick={onClose}>
            {adminCopy.actions.cancel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
