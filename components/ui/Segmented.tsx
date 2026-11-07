"use client";

import { cx } from "./cx";
import styles from "./Segmented.module.css";

type SegmentedOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Etichetta per i lettori di schermo. */
  label: string;
  fullWidth?: boolean;
  className?: string;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  fullWidth = false,
  className,
}: Props<T>) {
  return (
    <div role="group" aria-label={label} className={cx(styles.group, fullWidth && styles.full, className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={styles.item}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
