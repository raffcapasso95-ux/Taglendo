"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MonthCalendar } from "@/components/agenda/MonthCalendar";
import { OperatorAvatar } from "@/components/agenda/OperatorAvatar";
import flow from "@/components/agenda/Flow.module.css";
import field from "@/components/ui/Field.module.css";
import { cx } from "@/components/ui/cx";
import { confirmCode, loadSlots, requestCode, type Alternative, type Confirmed, type DaySlots, type Failure, type Slot } from "@/lib/booking/actions";
import { bookingCopy } from "@/lib/copy/booking";
import { shopCopy } from "@/lib/copy/shop";
import { monthBounds } from "@/lib/dates/calendar";
import { formatPrice } from "@/lib/dates/format";
import { addDays, dayNumber, monthShort, weekdayOf, weekdayShort } from "@/lib/dates/rome";
import { isEmail } from "@/lib/rules/forms";
import { formatMinutes, type DayHours } from "@/lib/rules/hours";
import { span } from "@/lib/rules/agenda";
import booking from "./Booking.module.css";
import styles from "./Shop.module.css";

type Service = { id: string; name: string; durationMin: number; priceCents: number };
type Member = { id: string; name: string };

type Props = {
  slug: string;
  phone: string;
  privacyHref: string;
  services: Service[];
  members: Member[];
  showPrices: boolean;
  today: string;
  maxAdvanceDays: number;
  week: DayHours[];
  /** Tempo di annullamento gratuito, già scritto («2 ore»), o null se si annulla solo al telefono. */
  cancelLimit: string | null;
};

type Step = "servizio" | "barbiere" | "orario" | "dati" | "codice" | "fatto";
type Alert = { message: string; alternatives?: Alternative[] };

const copy = shopCopy.booking;
const errors = bookingCopy.errors;
/** Quanti giorni mostra la fila e quanti se ne chiedono in una volta. */
const STRIP_DAYS = 9;
const WINDOW_DAYS = 14;

const dayText = (d: string) => `${weekdayShort(d)} ${dayNumber(d)} ${monthShort(d)}`;
const joinList = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);
const isOpenDay = (week: DayHours[], d: string) => {
  const h = week[weekdayOf(d)];
  return Boolean(h && !h.closed && h.openMin != null);
};
const Chev = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export function ShopBooking({ slug, phone, privacyHref, services, members, showPrices, today, maxAdvanceDays, week, cancelLimit }: Props) {
  const team = members.length;
  const solo = team <= 1;
  const steps: Step[] = solo ? ["servizio", "orario", "dati"] : ["servizio", "barbiere", "orario", "dati"];

  const [step, setStep] = useState<Step>("servizio");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [cache, setCache] = useState<Map<string, Slot[]>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const [code, setCode] = useState("");
  const [alert, setAlert] = useState<Alert | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, startLoad] = useTransition();
  const [busy, startBusy] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const focusTitle = useRef(false);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const member = members.find((m) => m.id === memberId) ?? null;
  const lastDay = addDays(today, maxAdvanceDays);
  const stripDays = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, i)).filter((d) => d <= lastDay);

  const go = useCallback((next: Step, direction: "fwd" | "back" = "fwd") => {
    setDir(direction);
    setStep(next);
    setAlert(null);
    focusTitle.current = true;
  }, []);

  // il cursore va sul titolo della domanda nuova
  useEffect(() => {
    if (!focusTitle.current) return;
    focusTitle.current = false;
    rootRef.current?.querySelector<HTMLElement>(`[data-title="${step}"]`)?.focus({ preventScroll: true });
  }, [step]);

  // «Prenota con …» dal team
  useEffect(() => {
    const onPick = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      if (!members.some((m) => m.id === id)) return;
      setMemberId(id);
      setStartMin(null);
      setDay(null);
      setCache(new Map());
      setLoaded(false);
      go(serviceId ? "orario" : "servizio");
    };
    window.addEventListener("shop:pick-barber", onPick);
    return () => window.removeEventListener("shop:pick-barber", onPick);
  }, [members, serviceId, go]);

  const addDays_ = (days: DaySlots[], from: string, count: number) =>
    setCache((prev) => {
      const next = new Map(prev);
      for (let i = 0; i < count; i++) next.set(addDays(from, i), []);
      for (const d of days) next.set(d.date, d.slots);
      return next;
    });

  // gli orari si chiedono quando si arriva alla domanda «Quando vieni?» o cambiano servizio e barbiere
  useEffect(() => {
    if (step !== "orario" || !serviceId || loaded) return;
    let cancelled = false;
    startLoad(async () => {
      const r = await loadSlots({ slug, serviceId, memberId, from: today, days: WINDOW_DAYS });
      if (cancelled) return;
      if (r.ok) addDays_(r.days, today, WINDOW_DAYS);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [step, serviceId, memberId, loaded, slug, today]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const slotsOf = (d: string | null) => (d ? cache.get(d) : undefined);
  const firstFree = (() => {
    for (const d of [...cache.keys()].sort()) {
      const s = cache.get(d);
      if (s && s.length > 0) return { date: d, slot: s[0]! };
    }
    return null;
  })();
  // il giorno mostrato: quello scelto, altrimenti il primo con orari liberi
  const activeDay = day ?? firstFree?.date ?? null;
  const activeSlots = slotsOf(activeDay) ?? [];
  const dayKnown = activeDay != null && cache.has(activeDay);

  const pickDay = (d: string) => {
    setDay(d);
    setMoreOpen(false);
    if (!cache.has(d) && serviceId)
      startLoad(async () => {
        const r = await loadSlots({ slug, serviceId, memberId, from: d, days: 7 });
        addDays_(r.ok ? r.days : [], d, 7);
      });
  };

  const nextFreeDay = () => {
    if (!serviceId) return;
    const from = addDays(activeDay ?? today, 1);
    startLoad(async () => {
      const r = await loadSlots({ slug, serviceId, memberId, from, days: 21 });
      if (r.ok) {
        addDays_(r.days, from, 21);
        const first = r.days.find((d) => d.slots.length > 0);
        if (first) setDay(first.date);
        else setAlert({ message: shopCopy.booking.when.noneAtAll });
      }
    });
  };

  const chooseService = (id: string) => {
    if (id !== serviceId) {
      setServiceId(id);
      setStartMin(null);
      setDay(null);
      setCache(new Map());
      setLoaded(false);
    }
    // se il cliente è arrivato da «Prenota con …» la domanda «Con chi?» si salta
    go(solo || memberId !== null ? "orario" : "barbiere");
  };

  const chooseMember = (id: string | null) => {
    if (id !== memberId) {
      setMemberId(id);
      setStartMin(null);
      setDay(null);
      setCache(new Map());
      setLoaded(false);
    }
    go("orario");
  };

  const chooseTime = (date: string, min: number) => {
    setDay(date);
    setStartMin(min);
    go("dati");
  };

  const back = () => {
    const i = steps.indexOf(step as Step);
    if (i > 0) go(steps[i - 1]!, "back");
  };

  const payload = () => ({ slug, serviceId: serviceId!, memberId, date: day!, startMin: startMin!, name, email, phone: phoneNumber, privacy, marketing, website });
  const failureAlert = (r: Failure): Alert => ({ message: r.error, alternatives: r.kind === "conflict" ? r.alternatives : undefined });

  const missing = [!name.trim() && copy.data.missingName, !isEmail(email.trim()) && copy.data.missingEmail, !privacy && copy.data.missingPrivacy].filter(Boolean) as string[];

  const send = () => {
    if (missing.length > 0) {
      setTried(true);
      const target = !name.trim() ? "bk-name" : !isEmail(email.trim()) ? "bk-mail" : "bk-privacy-box";
      rootRef.current?.querySelector<HTMLElement>(`#${target}`)?.focus();
      return;
    }
    setAlert(null);
    startBusy(async () => {
      try {
        const r = await requestCode(payload());
        if (r.ok) {
          setCode("");
          setCooldown(60);
          return go("codice");
        }
        setAlert(failureAlert(r));
        if (r.kind === "wait" && r.waitSeconds) setCooldown(r.waitSeconds);
      } catch {
        setAlert({ message: errors.network });
      }
    });
  };

  const resend = () =>
    startBusy(async () => {
      setAlert(null);
      try {
        const r = await requestCode(payload());
        if (r.ok) return setCooldown(60);
        setAlert(failureAlert(r));
        if (r.kind === "wait" && r.waitSeconds) setCooldown(r.waitSeconds);
      } catch {
        setAlert({ message: errors.network });
      }
    });

  const confirm = (value: string, override?: { date: string; startMin: number }) =>
    startBusy(async () => {
      setAlert(null);
      try {
        const r = await confirmCode({ slug, email, code: value, override });
        if (r.ok) {
          setConfirmed(r);
          return go("fatto");
        }
        setAlert(failureAlert(r));
        if (r.kind === "code") setCode("");
      } catch {
        setAlert({ message: errors.network });
      }
    });

  const onCode = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !busy) confirm(digits);
  };

  const pickAlternative = (a: Alternative) => {
    setDay(a.date);
    setStartMin(a.startMin);
    setAlert(null);
    if (step === "codice" && code.length === 6) confirm(code, a);
    else if (step !== "codice") go("dati");
  };

  const restart = () => {
    setServiceId(null);
    setMemberId(null);
    setStartMin(null);
    setDay(null);
    setCache(new Map());
    setLoaded(false);
    setCode("");
    setConfirmed(null);
    setTried(false);
    go("servizio", "back");
  };

  const whenShort = day && startMin !== null ? `${dayText(day)} · ${formatMinutes(startMin)}` : "";
  const whenButton = day && startMin !== null ? `${dayText(day)}, ${formatMinutes(startMin)}` : "";
  const memberName = member?.name ?? null;
  const sumService = service ? `${service.name} · ${span(service.durationMin)}` : "";

  const alertBox = (forSteps: Step[]) =>
    alert && forSteps.includes(step) ? (
      <div className={booking.alert} role="alert">
        <span>{alert.message}</span>
        {alert.alternatives ? <span>{bookingCopy.errors.takenText(alert.alternatives.length > 0)}</span> : null}
        {alert.alternatives && alert.alternatives.length > 0 ? (
          <div className={booking.pills}>
            {alert.alternatives.map((a) => (
              <button key={`${a.date}-${a.startMin}`} type="button" className={booking.pill} style={{ paddingLeft: 14 }} onClick={() => pickAlternative(a)}>
                {dayText(a.date)} · {formatMinutes(a.startMin)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    ) : null;

  const marksFor = useCallback(
    (month: string) => {
      const { first, last } = monthBounds(month);
      const closed: string[] = [];
      const busyDays: string[] = [];
      for (let d = first; d <= last; d = addDays(d, 1)) {
        if (!isOpenDay(week, d)) closed.push(d);
        else if (d >= today && d <= lastDay) busyDays.push(d);
      }
      return { closed, busy: busyDays };
    },
    [week, today, lastDay],
  );

  const titleProps = (s: Step) => ({ tabIndex: -1, "data-title": s });
  const stepNumber = steps.indexOf(step) + 1;
  const showingWizard = step !== "codice" && step !== "fatto";

  const aside = (
    <aside className={styles.bookAside}>
      <div className={styles.asideCard}>
        <span className={styles.asideTitle}>{cancelLimit ? copy.aside.cancelTitle : copy.aside.phoneTitle}</span>
        <p className={styles.asideText}>{cancelLimit ? copy.aside.cancelBody(cancelLimit) : copy.aside.phoneBody}</p>
        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={styles.asidePhone}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 4h3l1.5 4-2 1.3a11 11 0 0 0 7.2 7.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
          </svg>
          {phone}
        </a>
      </div>
      <ul className={styles.promises} aria-label={copy.aside.promises.brief}>
        <li className={styles.promise}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="3.8" />
            <path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" />
          </svg>
          <span>{copy.aside.promises.none}</span>
        </li>
        <li className={styles.promise}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
            <path d="M3 10h18" />
          </svg>
          <span>{copy.aside.promises.shop}</span>
        </li>
        {cancelLimit ? (
          <li className={styles.promise}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
            </svg>
            <span>{copy.aside.promises.cancel(cancelLimit)}</span>
          </li>
        ) : null}
      </ul>
    </aside>
  );

  const priceLine = (s: Service) => (showPrices ? formatPrice(s.priceCents) : null);

  return (
    <div className={styles.bookLayout} id="prenota-card" ref={rootRef}>
      {showingWizard ? (
        <div className={cx(styles.bookPanel, styles.wizard)}>
          <div className={styles.wzHead}>
            {stepNumber > 1 ? (
              <button type="button" className={styles.wzBack} aria-label={copy.back} onClick={back}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
            ) : null}
            <div className={styles.wzProg}>
              <span className={styles.wzLabel} aria-live="polite">
                {copy.progress(stepNumber, steps.length, copy.steps[step as "servizio"])}
              </span>
              <div className={styles.wzBar} aria-hidden="true">
                {steps.map((s, i) => (
                  <span key={s} className={cx(styles.wzSeg, i <= stepNumber - 1 && styles.wzSegOn)} />
                ))}
              </div>
            </div>
          </div>

          <div className={styles.wzBody}>
            {step === "servizio" ? (
              <section className={styles.wzStep} data-dir={dir} aria-labelledby="wz-servizio">
                <h3 className={styles.wzTitle} id="wz-servizio" {...titleProps("servizio")}>
                  {copy.service.title}
                </h3>
                <p className={styles.wzSub}>{copy.service.sub}</p>
                <div className={styles.choices} role="group" aria-label={copy.service.group}>
                  {services.map((s) => (
                    <button key={s.id} type="button" className={cx(styles.choice, s.id === serviceId && styles.choiceOn)} aria-pressed={s.id === serviceId} onClick={() => chooseService(s.id)}>
                      <span className={styles.choiceText}>
                        <span className={styles.choiceName}>{s.name}</span>
                        <span className={styles.choiceSub}>{span(s.durationMin)}</span>
                      </span>
                      {priceLine(s) ? <span className={styles.choicePrice}>{priceLine(s)}</span> : null}
                      <span className={styles.choiceChev}>
                        <Chev />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {step === "barbiere" ? (
              <section className={styles.wzStep} data-dir={dir} aria-labelledby="wz-barbiere">
                <h3 className={styles.wzTitle} id="wz-barbiere" {...titleProps("barbiere")}>
                  {copy.barber.title}
                </h3>
                <p className={styles.wzSub}>{copy.barber.sub}</p>
                <div className={styles.choices} role="group" aria-label={copy.barber.group}>
                  <button type="button" className={cx(styles.choice, styles.choiceAny)} aria-pressed={false} onClick={() => chooseMember(null)}>
                    <span className={cx(styles.who, styles.whoAny)}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="9" cy="8.5" r="3.5" />
                        <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
                        <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.8c1.9.7 3.1 2.4 3.5 5.2" />
                      </svg>
                    </span>
                    <span className={styles.choiceText}>
                      <span className={styles.choiceName}>{copy.barber.any}</span>
                      <span className={styles.choiceSub}>{copy.barber.anySub}</span>
                    </span>
                    <span className={styles.choiceChev}>
                      <Chev />
                    </span>
                  </button>
                  {members.map((m, i) => (
                    <button key={m.id} type="button" className={cx(styles.choice, memberId === m.id && styles.choiceOn)} aria-pressed={memberId === m.id} onClick={() => chooseMember(m.id)}>
                      <OperatorAvatar name={m.name} colorIndex={i} className={styles.who} />
                      <span className={styles.choiceText}>
                        <span className={styles.choiceName}>{m.name}</span>
                        <span className={styles.choiceSub}>{copy.barber.role}</span>
                      </span>
                      <span className={styles.choiceChev}>
                        <Chev />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {step === "orario" ? (
              <section className={styles.wzStep} data-dir={dir} aria-labelledby="wz-orario">
                <h3 className={styles.wzTitle} id="wz-orario" {...titleProps("orario")}>
                  {copy.when.title}
                </h3>
                <p className={styles.wzSub}>{copy.when.sub}</p>
                {firstFree ? (
                  <button type="button" className={styles.firstFree} onClick={() => chooseTime(firstFree.date, firstFree.slot.startMin)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />
                    </svg>
                    <span className={styles.choiceText}>
                      <span className={styles.firstLabel}>{copy.when.first}</span>
                      <span className={styles.choiceName}>
                        {firstFree.date === today ? copy.when.today : firstFree.date === addDays(today, 1) ? copy.when.tomorrow : dayText(firstFree.date)} alle {formatMinutes(firstFree.slot.startMin)}
                        {!solo ? ` con ${members.find((m) => m.id === firstFree.slot.memberId)?.name ?? ""}` : ""}
                      </span>
                    </span>
                    <span className={styles.choiceChev}>
                      <Chev />
                    </span>
                  </button>
                ) : null}
                {firstFree ? (
                  <p className={styles.orLine}>
                    <span>{copy.when.or}</span>
                  </p>
                ) : null}
                <div className={styles.days} role="group" aria-label={copy.when.day}>
                  {stripDays.map((d) => {
                    const open = isOpenDay(week, d);
                    const top = d === today ? copy.when.today : d === addDays(today, 1) ? copy.when.tomorrow : weekdayShort(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        className={cx(styles.day, d === activeDay && styles.dayOn)}
                        aria-pressed={d === activeDay}
                        disabled={!open}
                        onClick={() => pickDay(d)}
                      >
                        <span className={styles.dayTop}>{top}</span>{" "}
                        <span className={styles.dayNum}>{dayNumber(d)}</span>
                        {open ? null : (
                          <>
                            {" "}
                            <span className={styles.dayClosed}>{copy.when.closed}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                  <button type="button" className={cx(styles.day, styles.dayMore)} aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3.5" y="5" width="17" height="15" rx="3" />
                      <path d="M8 3v4M16 3v4M3.5 10h17" />
                    </svg>
                    <span className={styles.dayTop}>{copy.when.moreTop}</span>
                    <span className={styles.dayTop}>{copy.when.moreBottom}</span>
                  </button>
                </div>
                {moreOpen ? (
                  <div className={styles.calBox}>
                    <div className={styles.Dialogs_whenCal}>
                      <MonthCalendar mode="book" selected={activeDay} today={today} onSelect={pickDay} heading="h4" localMarks={marksFor} maxDate={lastDay} />
                    </div>
                  </div>
                ) : null}

                <div className={styles.slots} aria-busy={loading}>
                  {[
                    { title: copy.when.morning, list: activeSlots.filter((s) => s.startMin < 13 * 60) },
                    { title: copy.when.afternoon, list: activeSlots.filter((s) => s.startMin >= 13 * 60) },
                  ]
                    .filter((g) => g.list.length > 0)
                    .map((g) => (
                      <div key={g.title} className={styles.slotGroup}>
                        <p className={styles.slotTitle}>{g.title}</p>
                        <div className={styles.slotGrid} role="group" aria-label={g.title}>
                          {g.list.map((s) => (
                            <button key={s.startMin} type="button" className={styles.slot} aria-pressed={startMin === s.startMin && day === activeDay} onClick={() => chooseTime(activeDay!, s.startMin)}>
                              {formatMinutes(s.startMin)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
                {dayKnown && !loading && activeSlots.length === 0 ? (
                  <div className={styles.noSlots}>
                    <p>{copy.when.full}</p>
                    <button type="button" className={styles.nextFree} onClick={nextFreeDay}>
                      {copy.when.next}
                    </button>
                  </div>
                ) : null}
                {alertBox(["orario"])}
              </section>
            ) : null}

            {step === "dati" ? (
              <section className={styles.wzStep} data-dir={dir} aria-labelledby="wz-dati">
                <h3 className={styles.wzTitle} id="wz-dati" {...titleProps("dati")}>
                  {copy.data.title}
                </h3>
                {alertBox(["dati"])}
                <div className={styles.sum}>
                  <div className={styles.sumRow}>
                    <span className={styles.sumLabel}>{copy.data.service}</span>
                    <strong>{sumService}</strong>
                    <button type="button" className={styles.sumEdit} onClick={() => go("servizio", "back")}>
                      {copy.data.change}
                    </button>
                  </div>
                  {!solo ? (
                    <div className={styles.sumRow}>
                      <span className={styles.sumLabel}>{copy.data.barber}</span>
                      <strong>{memberName ?? copy.barber.any}</strong>
                      <button type="button" className={styles.sumEdit} onClick={() => go("barbiere", "back")}>
                        {copy.data.change}
                      </button>
                    </div>
                  ) : null}
                  <div className={styles.sumRow}>
                    <span className={styles.sumLabel}>{copy.data.when}</span>
                    <strong>{whenShort}</strong>
                    <button type="button" className={styles.sumEdit} onClick={() => go("orario", "back")}>
                      {copy.data.change}
                    </button>
                  </div>
                  {showPrices && service ? (
                    <div className={styles.sumRow}>
                      <span className={styles.sumLabel}>{copy.data.price}</span>
                      <strong>{copy.data.inShop(formatPrice(service.priceCents))}</strong>
                    </div>
                  ) : null}
                </div>
                <div className={styles.fields}>
                  <div className={cx(field.field, field.fieldLarge)}>
                    <label htmlFor="bk-name" className={field.label}>
                      {copy.data.name}
                    </label>
                    <div className={field.box}>
                      <input id="bk-name" className={field.inputLarge} autoComplete="name" enterKeyHint="next" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>
                  <div className={cx(field.field, field.fieldLarge)}>
                    <label htmlFor="bk-mail" className={field.label}>
                      {copy.data.email}
                    </label>
                    <div className={field.box}>
                      <input
                        id="bk-mail"
                        className={field.inputLarge}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="next"
                        maxLength={120}
                        placeholder="nome@esempio.it"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-describedby="bk-mail-hint"
                      />
                    </div>
                    <p className={field.hint} id="bk-mail-hint">
                      {copy.data.emailHint}
                    </p>
                  </div>
                  <div className={cx(field.field, field.fieldLarge)}>
                    <label htmlFor="bk-tel" className={field.label}>
                      {copy.data.phone} <span className={styles.optional}>{copy.data.optional}</span>
                    </label>
                    <div className={field.box}>
                      <input id="bk-tel" className={field.inputLarge} type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="done" maxLength={20} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                    </div>
                  </div>
                </div>
                {/* trappola per i programmi: le persone non lo vedono */}
                <input className="visually-hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px" }} />
                <div className={cx(booking.check, styles.Booking_check)}>
                  <button id="bk-privacy-box" type="button" role="checkbox" aria-checked={privacy} aria-labelledby="bk-privacy" className={booking.box} data-on={privacy} data-bad={tried && !privacy} onClick={() => setPrivacy((v) => !v)}>
                    {privacy ? "✓" : ""}
                  </button>
                  <span id="bk-privacy" className={cx(booking.checkText, styles.Booking_checkText)} onClick={() => setPrivacy((v) => !v)}>
                    {copy.data.privacyBefore}
                    <a href={privacyHref} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      {copy.data.privacyLink}
                    </a>{" "}
                    {copy.data.privacyAfter}
                  </span>
                </div>
                <div className={cx(booking.check, styles.Booking_check)}>
                  <button type="button" role="checkbox" aria-checked={marketing} aria-labelledby="bk-marketing" className={booking.box} data-on={marketing} onClick={() => setMarketing((v) => !v)}>
                    {marketing ? "✓" : ""}
                  </button>
                  <span id="bk-marketing" className={booking.checkText} onClick={() => setMarketing((v) => !v)}>
                    {copy.data.marketing} <span className={booking.hint}>{copy.data.marketingHint}</span>
                  </span>
                </div>
                <button type="button" className={styles.wzConfirm} aria-disabled={missing.length > 0 || busy} onClick={send}>
                  <span>{busy ? copy.data.sending : copy.data.confirm(whenButton)}</span>
                </button>
                {missing.length > 0 ? (
                  <p className={styles.wzMissing} data-bad={tried} key={tried ? "bad" : "ok"}>
                    {copy.data.missing(joinList(missing))}
                  </p>
                ) : null}
                <p className={styles.fine}>{copy.data.fine(cancelLimit)}</p>
              </section>
            ) : null}
          </div>
        </div>
      ) : step === "codice" ? (
        <div className={cx(styles.bookPanel, styles.bookPanelSmall)}>
          <div className={styles.recap}>
            <span className={cx(flow.num, styles.recapTick)} aria-hidden="true">
              ✓
            </span>
            <span className={styles.recapText}>
              <strong>{whenShort}</strong>
              <span>
                {sumService}
                {showPrices && service ? ` · ${formatPrice(service.priceCents)}` : ""}
                {memberName && !solo ? ` · con ${memberName}` : ""}
              </span>
            </span>
            <button type="button" className={styles.recapChange} onClick={() => go("dati", "back")}>
              {copy.data.change}
            </button>
          </div>
          <div className={styles.codeBody}>
            <h3 className={booking.codeTitle} {...titleProps("codice")}>
              {bookingCopy.codeTitle}
            </h3>
            <span className={booking.codeText}>
              {bookingCopy.codeSentBefore}
              <strong>{email.trim()}</strong>
              {bookingCopy.codeSentAfter}
            </span>
            {alertBox(["codice"])}
            <input id="bk-code" className={booking.code} aria-label={bookingCopy.codeLabel} inputMode="numeric" autoComplete="one-time-code" enterKeyHint="done" placeholder="••••••" value={code} onChange={(e) => onCode(e.target.value)} />
            <div className={booking.codeLinks}>
              <button type="button" className={booking.link} onClick={() => go("dati", "back")}>
                {bookingCopy.wrongEmail}
              </button>
              <button type="button" className={booking.link} disabled={cooldown > 0 || busy} onClick={resend}>
                {cooldown > 0 ? bookingCopy.resendIn(cooldown) : bookingCopy.resend}
              </button>
            </div>
          </div>
        </div>
      ) : confirmed ? (
        <div className={cx(styles.bookPanel, styles.bookPanelSmall)}>
          <div className={cx(booking.done, styles.Booking_done)} role="status">
            <span className={booking.tick} aria-hidden="true">
              ✓
            </span>
            <h3 className={booking.cardTitle} {...titleProps("fatto")}>
              {bookingCopy.seeYou(confirmed.seeYou)}
            </h3>
            <div className={booking.rows}>
              {confirmed.rows.map((r) => (
                <div key={r.label} className={booking.row}>
                  <span className={booking.rowLabel}>{r.label}</span>
                  <strong className={booking.rowValue}>{r.value}</strong>
                </div>
              ))}
            </div>
            <span className={booking.doneNote}>
              {bookingCopy.summarySent(confirmed.email)} {confirmed.cancelUntil ? `Annulli gratis fino a ${confirmed.cancelUntil}.` : `Per spostare o annullare chiama lo ${phone}.`}
            </span>
            <div className={booking.doneActions}>
              <a href={`${confirmed.manageUrl}/calendario.ics`} className={cx(booking.primary, styles.Booking_primary)}>
                {bookingCopy.addCalendar}
              </a>
              <button type="button" className={booking.secondary} onClick={restart}>
                {bookingCopy.again}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {aside}
    </div>
  );
}
