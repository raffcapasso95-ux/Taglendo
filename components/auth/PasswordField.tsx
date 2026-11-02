"use client";

import { useState } from "react";
import { authCopy } from "@/lib/copy/auth";
import { PASSWORD_BARS, PASSWORD_LABELS, passwordLevel } from "@/lib/rules/password";
import { Field } from "@/components/ui";
import styles from "./PasswordField.module.css";

type Props = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  /** Mostra le 4 barre di robustezza sotto il campo (A2, A5). */
  meter?: boolean;
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
};

export function PasswordField({ name, label, value, onChange, onBlur, error, meter = false, autoComplete, autoFocus }: Props) {
  const [visible, setVisible] = useState(false);
  const level = passwordLevel(value);
  const bars = PASSWORD_BARS[level];

  return (
    <div className={styles.wrap}>
      <Field
        size="large"
        name={name}
        label={label}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        error={error}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        trailing={
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? authCopy.fields.hide : authCopy.fields.show}
          </button>
        }
      />
      {meter && value.length > 0 ? (
        <div className={styles.meter} data-level={level}>
          <span className={styles.bars} aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={i <= bars ? styles.barOn : styles.bar} />
            ))}
          </span>
          <span className={styles.meterLabel} aria-live="polite">
            {level === "short" ? "" : PASSWORD_LABELS[level]}
          </span>
        </div>
      ) : null}
    </div>
  );
}
