"use client";

import { useId, type ReactNode } from "react";
import { cx } from "./cx";
import styles from "./Checkbox.module.css";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Il testo può contenere link: cliccarli non cambia la casella. */
  children: ReactNode;
  /** Nome del campo nel modulo: se la casella è spuntata invia "on". */
  name?: string;
  /** Messaggio d'errore (es. informativa privacy non accettata). */
  error?: string;
  disabled?: boolean;
  className?: string;
};

/** Casella come quella dell'informativa privacy nella prenotazione. */
export function Checkbox({ checked, onChange, children, name, error, disabled, className }: Props) {
  const errorId = useId();
  return (
    <div className={cx(styles.wrap, className)}>
      <label className={styles.row}>
        <input
          type="checkbox"
          className={styles.native}
          name={name}
          checked={checked}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.box} aria-hidden="true">
          {checked ? "✓" : ""}
        </span>
        <span className={styles.text}>{children}</span>
      </label>
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
