"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import styles from "./CodeInput.module.css";

type Props = {
  /** Nome del campo nascosto che porta il codice al server. */
  name: string;
  label: string;
  error?: string;
  length?: number;
  onChange?: (code: string) => void;
};

/** Codice a 6 cifre in caselle separate; accetta il codice incollato per intero. */
export function CodeInput({ name, label, error, length = 6, onChange }: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join("");

  const commit = (next: string[], focusIndex?: number) => {
    setDigits(next);
    const joined = next.join("");
    onChange?.(joined);
    if (focusIndex !== undefined) refs.current[Math.min(focusIndex, length - 1)]?.focus();
  };

  const onInput = (i: number, raw: string) => {
    const value = raw.replace(/\D/g, "");
    if (!value) {
      const next = [...digits];
      next[i] = "";
      commit(next);
      return;
    }
    // Più cifre in una casella (compilazione automatica o incolla): le distribuisce.
    const next = [...digits];
    value.split("").slice(0, length - i).forEach((d, k) => (next[i + k] = d));
    commit(next, i + value.length);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      commit(next, i - 1);
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = Array(length).fill("") as string[];
    pasted.split("").slice(0, length).forEach((d, k) => (next[k] = d));
    commit(next, pasted.length);
  };

  return (
    <div className={styles.wrap}>
      <span className={styles.label} id={`${name}-label`}>
        {label}
      </span>
      <div className={styles.boxes} role="group" aria-labelledby={`${name}-label`}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={styles.box}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={length}
            value={d}
            aria-label={`Cifra ${i + 1} di ${length}`}
            aria-invalid={error ? true : undefined}
            autoFocus={i === 0}
            onChange={(e) => onInput(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
      <input type="hidden" name={name} value={code} />
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
