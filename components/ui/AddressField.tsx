"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AddressSuggestion } from "@/lib/places/suggest";
import { Field } from "./Field";
import styles from "./AddressField.module.css";

type Props = {
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength?: number;
};

const newToken = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

/**
 * NUOVO: campo indirizzo con i suggerimenti di Google Maps (via /api/indirizzi).
 * Si scrive come in un campo normale; dopo 3 lettere compaiono fino a 5 indirizzi, scelti col tocco o con frecce e Invio.
 * Senza chiave Google sul server resta un campo normale.
 */
export function AddressField({ name, label, value, onChange, error, maxLength = 120 }: Props) {
  const listId = useId();
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [enabled, setEnabled] = useState(true);
  const token = useRef(newToken());
  const typed = useRef(false);

  useEffect(() => {
    if (!enabled || !typed.current) return;
    const q = value.trim();
    if (q.length < 3) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/indirizzi?q=${encodeURIComponent(q)}&s=${token.current}`, { signal: ctrl.signal });
        const data = (await res.json()) as { enabled: boolean; suggestions: AddressSuggestion[] };
        if (!data.enabled) setEnabled(false);
        setItems(data.suggestions ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        /* rete assente o richiesta annullata: il campo resta normale */
      }
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [value, enabled]);

  const pick = (s: AddressSuggestion) => {
    typed.current = false;
    onChange(s.text);
    setItems([]);
    setOpen(false);
    token.current = newToken(); // una ricerca conclusa: la prossima è una sessione nuova
  };

  const shown = open && items.length > 0 && value.trim().length >= 3;

  return (
    <div className={styles.wrap}>
      <Field
        size="large"
        name={name}
        label={label}
        autoComplete="street-address"
        maxLength={maxLength}
        value={value}
        error={error}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!shown) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(items[active]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {shown ? (
        <ul className={styles.list} id={listId} role="listbox" aria-label={`Suggerimenti per ${label.toLowerCase()}`}>
          {items.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={styles.option}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
            >
              <svg className={styles.pin} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z" />
                <circle cx="12" cy="9.5" r="2.5" />
              </svg>
              <span className={styles.text}>
                <span className={styles.main}>{s.main}</span>
                {s.secondary ? <span className={styles.secondary}>{s.secondary}</span> : null}
              </span>
            </li>
          ))}
          <li className={styles.credit} aria-hidden="true">
            Suggerimenti di Google
          </li>
        </ul>
      ) : null}
    </div>
  );
}
