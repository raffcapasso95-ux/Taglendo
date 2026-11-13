"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { searchCopy } from "@/lib/copy/search";
import { addDays, romeDate } from "@/lib/dates/rome";
import { dayLabel, MAX_DAYS_AHEAD, searchHref } from "@/lib/search/rules";
import styles from "./Search.module.css";

const copy = searchCopy.box;

// la data di oggi si legge solo nel browser (sul server la pagina si prepara una volta per tutti)
const noop = () => () => {};
const useToday = () => useSyncExternalStore(noop, () => romeDate(new Date()), () => null);
/** «Sab 14 nov» senza sapere che giorno è oggi. */
const plainDay = (d: string) => {
  const w = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)).replace(/\./g, "");
  return w.charAt(0).toUpperCase() + w.slice(1);
};
type Place = { name: string; prov: string };
type Panel = "service" | "place" | "date" | null;

const ScissorsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
  </svg>
);
const PinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);
const LocateIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </svg>
);
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);

/** Un campo della barra: etichetta piccola sopra, valore sotto, riquadro di suggerimenti che si apre dal campo. */
function Segment({ icon, label, children, panel, open, className }: { icon: ReactNode; label: string; children: ReactNode; panel: ReactNode; open: boolean; className?: string }) {
  return (
    <div className={cx(styles.segment, open && styles.segmentOn, className)}>
      <span className={styles.segmentIcon}>{icon}</span>
      <span className={styles.segmentBody}>
        <span className={styles.segmentLabel} aria-hidden="true">
          {label}
        </span>
        {children}
      </span>
      {panel}
    </div>
  );
}

/**
 * NUOVO: la barra di ricerca dei saloni, come nei portali di prenotazione: Servizio · Dove · Quando.
 * Basta anche solo la città. «Vicino a me» è la prima voce di «Dove». Su computer è una sola barra, sul telefono tre righe.
 * Senza JavaScript resta un modulo che porta a /cerca con gli stessi parametri.
 */
export function SearchBox({
  initial = "",
  service: initialService = "",
  date: initialDate = null,
  services = [],
  tone = "light",
  compact = false,
}: {
  initial?: string;
  service?: string;
  date?: string | null;
  services?: readonly string[];
  tone?: "light" | "dark";
  compact?: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const root = useRef<HTMLFormElement>(null);
  const placeInput = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [service, setService] = useState(initialService);
  const [place, setPlace] = useState(initial);
  const [date, setDate] = useState<string | null>(initialDate);
  const [places, setPlaces] = useState<Place[]>([]);
  const [active, setActive] = useState(-1);
  const [geo, setGeo] = useState<"idle" | "busy" | "denied">("idle");
  const [missing, setMissing] = useState(false);
  const typed = useRef(false);
  const today = useToday();

  // i suggerimenti delle città seguono ciò che si scrive
  useEffect(() => {
    if (!typed.current) return;
    const q = place.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/luoghi?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: { suggestions?: Place[] }) => {
          setPlaces(d.suggestions ?? []);
          setActive(-1);
        })
        .catch(() => {});
    }, 140);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [place]);

  // un clic fuori dalla barra chiude il riquadro aperto
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [panel]);

  const go = (where: { dove?: string; lat?: number; lng?: number }) => {
    setPanel(null);
    router.push(searchHref({ ...where, servizio: service.trim() || null, data: date }));
  };

  const nearMe = () => {
    if (!("geolocation" in navigator)) return setGeo("denied");
    setGeo("busy");
    setPanel(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo("idle");
        go({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setGeo("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };

  // le voci di «Servizio»: i più diffusi tra i saloni più quelli di sempre, filtrati da ciò che si scrive
  const serviceOptions = [...new Set([...services, ...searchCopy.commonServices])]
    .filter((s) => !service.trim() || s.toLowerCase().includes(service.trim().toLowerCase()))
    .slice(0, 8);
  // le voci di «Dove»: prima «Vicino a me», poi le città
  const placeOptions: Array<{ kind: "near" } | { kind: "city"; city: Place }> = [{ kind: "near" }, ...(place.trim().length >= 2 ? places : []).map((c) => ({ kind: "city" as const, city: c }))];

  const days = today ? Array.from({ length: 14 }, (_, i) => addDays(today, i)) : [];
  const dateText = !date ? copy.anyDate : today ? dayLabel(`${date}T12:00:00Z`, new Date(`${today}T12:00:00Z`)) : plainDay(date);

  const listKeys = (e: React.KeyboardEvent, count: number, pick: (i: number) => void) => {
    if (e.key === "Escape") return setPanel(null);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? count - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(active);
    }
  };

  const pickPlace = (i: number) => {
    const o = placeOptions[i];
    if (!o) return;
    if (o.kind === "near") return nearMe();
    typed.current = false;
    setPlace(o.city.name);
    setMissing(false);
    go({ dove: o.city.name });
  };

  return (
    <div className={cx(styles.box, tone === "dark" && styles.boxDark, compact && styles.boxCompact)}>
      <form
        ref={root}
        className={styles.bar}
        action="/cerca"
        role="search"
        onKeyDown={(e) => e.key === "Escape" && setPanel(null)}
        onSubmit={(e) => {
          e.preventDefault();
          let where = place.trim();
          // «bolo» + Cerca: si prende la prima città suggerita, se quella scritta non è già una città
          const first = places[0];
          if (where && first && !places.some((c) => c.name.toLowerCase() === where.toLowerCase())) where = first.name;
          if (!where) {
            setMissing(true);
            setPanel("place");
            placeInput.current?.focus();
            return;
          }
          go({ dove: where });
        }}
      >
        <Segment
          icon={<ScissorsIcon />}
          label={copy.serviceLabel}
          open={panel === "service"}
          className={styles.segService}
          panel={
            <ul id={`${id}-svc`} role="listbox" aria-label={copy.serviceSuggestions} className={styles.pop} data-open={panel === "service" && serviceOptions.length > 0 ? "true" : "false"}>
              {serviceOptions.map((s, i) => (
                <li
                  key={s}
                  id={`${id}-svc-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={cx(styles.option, i === active && styles.optionOn)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setService(s);
                    setPanel("place");
                    placeInput.current?.focus();
                  }}
                >
                  <ScissorsIcon />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          }
        >
          <input
            className={styles.segmentInput}
            name="servizio"
            type="text"
            autoComplete="off"
            enterKeyHint="next"
            aria-label={copy.serviceLabel}
            placeholder={copy.servicePlaceholder}
            role="combobox"
            aria-expanded={panel === "service"}
            aria-controls={`${id}-svc`}
            aria-autocomplete="list"
            aria-activedescendant={panel === "service" && active >= 0 ? `${id}-svc-${active}` : undefined}
            value={service}
            onFocus={() => {
              setPanel("service");
              setActive(-1);
            }}
            onChange={(e) => {
              setService(e.target.value);
              setPanel("service");
              setActive(-1);
            }}
            onKeyDown={(e) =>
              listKeys(e, serviceOptions.length, (i) => {
                setService(serviceOptions[i]!);
                setPanel("place");
                placeInput.current?.focus();
              })
            }
          />
        </Segment>

        <Segment
          icon={<PinIcon />}
          label={copy.whereLabel}
          open={panel === "place"}
          className={styles.segPlace}
          panel={
            <ul id={`${id}-place`} role="listbox" aria-label={copy.suggestions} className={styles.pop} data-open={panel === "place" ? "true" : "false"}>
              {placeOptions.map((o, i) => (
                <li
                  key={o.kind === "near" ? "near" : `${o.city.name}-${o.city.prov}`}
                  id={`${id}-place-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={cx(styles.option, o.kind === "near" && styles.optionNear, i === active && styles.optionOn)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickPlace(i);
                  }}
                >
                  {o.kind === "near" ? (
                    <>
                      <span className={styles.optionIcon}>
                        <LocateIcon />
                      </span>
                      <span className={styles.optionText}>
                        <span>{geo === "busy" ? copy.locating : copy.nearMe}</span>
                        <span className={styles.optionSub}>{copy.nearMeSub}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <PinIcon />
                      <span>{o.city.name}</span>
                      <span className={styles.suggestionProv}>{o.city.prov}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          }
        >
          <input
            ref={placeInput}
            className={styles.segmentInput}
            name="dove"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            aria-label={copy.label}
            aria-invalid={missing || undefined}
            placeholder={copy.placeholder}
            role="combobox"
            aria-expanded={panel === "place"}
            aria-controls={`${id}-place`}
            aria-autocomplete="list"
            aria-activedescendant={panel === "place" && active >= 0 ? `${id}-place-${active}` : undefined}
            value={place}
            onFocus={() => {
              setPanel("place");
              setActive(-1);
            }}
            onChange={(e) => {
              typed.current = true;
              setPlace(e.target.value);
              setMissing(false);
              setPanel("place");
            }}
            onKeyDown={(e) => listKeys(e, placeOptions.length, pickPlace)}
          />
        </Segment>

        <Segment
          icon={<CalendarIcon />}
          label={copy.whenLabel}
          open={panel === "date"}
          className={styles.segDate}
          panel={
            <div id={`${id}-date`} role="dialog" aria-label={copy.pickDay} className={cx(styles.pop, styles.popDate)} data-open={panel === "date" ? "true" : "false"}>
              <div className={styles.dayQuick}>
                {[
                  { value: null, label: copy.anyDate },
                  ...(today
                    ? [
                        { value: today, label: copy.today },
                        { value: addDays(today, 1), label: copy.tomorrow },
                      ]
                    : []),
                ].map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    className={cx(styles.dayChip, date === d.value && styles.dayChipOn)}
                    aria-pressed={date === d.value}
                    onClick={() => {
                      setDate(d.value);
                      setPanel(null);
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className={styles.dayGrid} role="group" aria-label={copy.pickDay}>
                {days.map((d) => {
                  const w = new Date(`${d}T12:00:00Z`);
                  const wd = new Intl.DateTimeFormat("it-IT", { weekday: "short", timeZone: "UTC" }).format(w).replace(".", "");
                  return (
                    <button
                      key={d}
                      type="button"
                      className={cx(styles.day, date === d && styles.dayOn)}
                      aria-pressed={date === d}
                      aria-label={new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))}
                      onClick={() => {
                        setDate(d);
                        setPanel(null);
                      }}
                    >
                      <span className={styles.dayWeek}>{wd}</span>
                      <span className={styles.dayNum}>{Number(d.slice(8))}</span>
                    </button>
                  );
                })}
              </div>
              <label className={styles.dayOther}>
                <span>{copy.otherDay}</span>
                <input
                  type="date"
                  min={today ?? undefined}
                  max={today ? addDays(today, MAX_DAYS_AHEAD) : undefined}
                  value={date ?? ""}
                  onChange={(e) => {
                    setDate(e.target.value || null);
                    if (e.target.value) setPanel(null);
                  }}
                />
              </label>
            </div>
          }
        >
          <button type="button" className={cx(styles.segmentValue, !date && styles.segmentPlaceholder)} aria-label={`${copy.whenLabel}: ${dateText}`} aria-expanded={panel === "date"} aria-controls={`${id}-date`} onClick={() => setPanel(panel === "date" ? null : "date")}>
            {dateText}
          </button>
          {date ? <input type="hidden" name="data" value={date} /> : null}
        </Segment>

        <button type="submit" className={styles.submit}>
          <SearchIcon />
          <span>{copy.submit}</span>
        </button>
      </form>
      {missing ? (
        <p className={styles.geoError} role="alert">
          {copy.needPlace}
        </p>
      ) : null}
      {geo === "denied" ? (
        <p className={styles.geoError} role="alert">
          {copy.denied}
        </p>
      ) : null}
    </div>
  );
}
