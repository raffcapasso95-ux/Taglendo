"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cx } from "./cx";
import styles from "./Field.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "size"> & {
  label: string;
  /** Testo di aiuto sotto il campo. */
  hint?: string;
  /** Messaggio d'errore: se presente il campo è segnato come non valido. */
  error?: string;
  id?: string;
  /** large: campi alti 50 px delle schermate di accesso e primo avvio. */
  size?: "default" | "large";
  /** Elemento a destra dentro il campo (es. "Mostra" per la password). Solo con size="large". */
  trailing?: ReactNode;
  /** Elemento a sinistra dentro il campo (es. la lente della ricerca). Solo con size="large". */
  leading?: ReactNode;
  /** Classi in più per il riquadro del campo e per l'etichetta (solo con size="large" per il riquadro). */
  boxClassName?: string;
  labelClassName?: string;
  /** Per mettere il cursore nel campo dall'esterno. */
  ref?: Ref<HTMLInputElement>;
};

export function Field({ label, hint, error, id, size = "default", trailing, leading, boxClassName, labelClassName, className, ...input }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const control = (
    <input
      id={inputId}
      className={size === "large" ? styles.inputLarge : styles.input}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      {...input}
    />
  );

  return (
    <div className={cx(styles.field, size === "large" && styles.fieldLarge, className)}>
      <label htmlFor={inputId} className={cx(styles.label, labelClassName)}>
        {label}
      </label>
      {size === "large" ? (
        <div className={cx(styles.box, error && styles.boxInvalid, boxClassName)}>
          {leading}
          {control}
          {trailing}
        </div>
      ) : (
        control
      )}
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
