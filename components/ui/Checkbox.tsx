"use client";

import type { ReactNode } from "react";
import { cx } from "./cx";
import styles from "./Checkbox.module.css";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  /** Messaggio d'errore (es. informativa privacy non accettata). */
  error?: string;
  disabled?: boolean;
  className?: string;
};

/** Casella come quella dell'informativa privacy nella prenotazione. */
export function Checkbox({ checked, onChange, children, error, disabled, className }: Props) {
  return (
    <div className={cx(styles.wrap, className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        className={styles.row}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.box} aria-hidden="true">
          {checked ? "✓" : ""}
        </span>
        <span>{children}</span>
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
