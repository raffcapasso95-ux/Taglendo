"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";
import { searchCopy } from "@/lib/copy/search";
import styles from "./Search.module.css";

const copy = searchCopy.box;
type Suggestion = { name: string; prov: string };

/**
 * NUOVO: il campo «Dove» della ricerca dei saloni. Scrivendo propone le città (dall'elenco dei comuni);
 * «Vicino a me» usa la posizione del telefono. Senza JavaScript resta un modulo normale che porta a /cerca.
 */
export function SearchBox({ initial = "", tone = "light" }: { initial?: string; tone?: "light" | "dark" }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(initial);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [geo, setGeo] = useState<"idle" | "busy" | "denied">("idle");
  const typed = useRef(false);

  // i suggerimenti seguono ciò che si scrive (non il valore iniziale, né una città appena scelta)
  useEffect(() => {
    if (!typed.current) return;
    const q = value.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/luoghi?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { suggestions?: Suggestion[] }) => {
          setItems(d.suggestions ?? []);
          setActive(-1);
          setOpen(true);
        })
        .catch(() => {});
    }, 140);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  const go = (where: string) => {
    typed.current = false;
    setValue(where);
    setOpen(false);
    router.push(`/cerca?dove=${encodeURIComponent(where)}`);
  };

  const nearMe = () => {
    if (!("geolocation" in navigator)) return setGeo("denied");
    setGeo("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo("idle");
        router.push(`/cerca?lat=${pos.coords.latitude.toFixed(4)}&lng=${pos.coords.longitude.toFixed(4)}`);
      },
      () => setGeo("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };

  const shown = open && items.length > 0 && value.trim().length >= 2;

  return (
    <div className={cx(styles.box, tone === "dark" && styles.boxDark)}>
      <form
        className={styles.form}
        action="/cerca"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const pick = active >= 0 ? items[active] : undefined;
          const where = pick?.name ?? value.trim();
          if (where) go(where);
        }}
      >
        <div className={styles.field}>
          <svg className={styles.fieldIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          <input
            className={styles.input}
            name="dove"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            aria-label={copy.label}
            placeholder={copy.placeholder}
            role="combobox"
            aria-expanded={shown}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
            value={value}
            onChange={(e) => {
              typed.current = true;
              setValue(e.target.value);
            }}
            onFocus={() => items.length > 0 && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (!shown) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => (a + 1) % items.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
              }
            }}
          />
          <ul id={listId} role="listbox" aria-label={copy.suggestions} className={styles.suggestions} hidden={!shown}>
            {items.map((s, i) => (
              <li
                key={`${s.name}-${s.prov}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={cx(styles.suggestion, i === active && styles.suggestionOn)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(s.name);
                }}
              >
                <span>{s.name}</span>
                <span className={styles.suggestionProv}>{s.prov}</span>
              </li>
            ))}
          </ul>
        </div>
        <button type="submit" className={styles.submit}>
          {copy.submit}
        </button>
      </form>
      <button type="button" className={styles.near} onClick={nearMe} disabled={geo === "busy"}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
        {geo === "busy" ? copy.locating : copy.nearMe}
      </button>
      {geo === "denied" ? (
        <p className={styles.geoError} role="alert">
          {copy.denied}
        </p>
      ) : null}
    </div>
  );
}
