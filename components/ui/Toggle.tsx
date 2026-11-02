"use client";

import { cx } from "./cx";
import styles from "./Toggle.module.css";

type Props = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/** Riga con interruttore, come nelle preferenze cookie della pagina del salone. */
export function Toggle({ label, description, checked, onChange, disabled, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cx(styles.row, className)}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.text}>
        <strong className={styles.label}>{label}</strong>
        {description ? <span className={styles.description}>{description}</span> : null}
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  );
}
