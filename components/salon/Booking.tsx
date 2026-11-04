"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { confirmCode, loadSlots, requestCode, type Alternative, type Confirmed, type DaySlots, type Failure } from "@/lib/booking/actions";
import { bookingCopy as copy } from "@/lib/copy/booking";
import { formatPrice } from "@/lib/dates/format";
import { addDays, dayNumber, monthShort, weekdayOf, weekdayShort } from "@/lib/dates/rome";
import { span } from "@/lib/rules/agenda";
import { formatMinutes } from "@/lib/rules/hours";
import { isEmail } from "@/lib/rules/forms";
import styles from "./Booking.module.css";

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
};

type Step = "service" | "when" | "data" | "code" | "done";
type Alert = { message: string; alternatives?: Alternative[] };

const SHORT_DAY = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"];
const dayText = (d: string) => `${weekdayShort(d)} ${dayNumber(d)} ${monthShort(d)}`;
const mondayOf = (d: string) => addDays(d, -((weekdayOf(d) + 6) % 7));
const initial = (name: string) => name.trim().charAt(0).toUpperCase();

export function Booking({ slug, phone, privacyHref, services, members, showPrices, today, maxAdvanceDays }: Props) {
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [weekIndex, setWeekIndex] = useState(0);
  const [week, setWeek] = useState<DaySlots[]>([]);
  const [quick, setQuick] = useState<Array<{ date: string; startMin: number }>>([]);
  const [weekReady, setWeekReady] = useState(false);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [privacyTried, setPrivacyTried] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [website, setWebsite] = useState("");
  const [code, setCode] = useState("");
  const [alert, setAlert] = useState<Alert | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, startLoad] = useTransition();
  const [busy, startBusy] = useTransition();

  const service = services.find((s) => s.id === serviceId) ?? null;
  const member = members.find((m) => m.id === memberId) ?? null;
  const multiple = members.length > 1;
  const mondayToday = mondayOf(today);
  const weekStart = addDays(mondayToday, weekIndex * 7);
  const lastDay = addDays(today, maxAdvanceDays);
  const hasNext = addDays(weekStart, 7) <= lastDay;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const slotsByDate = new Map(week.map((d) => [d.date, d.slots]));
  const activeDate = pickedDate && days.includes(pickedDate) ? pickedDate : (days.find((d) => (slotsByDate.get(d)?.length ?? 0) > 0) ?? null);
  const activeSlots = activeDate ? (slotsByDate.get(activeDate) ?? []) : [];
  const anyFree = week.some((d) => d.slots.length > 0);

  // Gli orari si ricaricano quando cambia servizio, barbiere o settimana.
  useEffect(() => {
    if (step !== "when" || !serviceId) return;
    let cancelled = false;
    startLoad(async () => {
      const [w, q] = await Promise.all([
        loadSlots({ slug, serviceId, memberId, from: weekStart, days: 7 }),
        weekIndex === 0 ? loadSlots({ slug, serviceId, memberId, from: today, days: 14 }) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setWeek(w.ok ? w.days : []);
      setWeekReady(true);
      if (q && q.ok) setQuick(q.days.flatMap((d) => d.slots.map((s) => ({ date: d.date, startMin: s.startMin }))).slice(0, 3));
      else if (weekIndex === 0) setQuick([]);
    });
    return () => {
      cancelled = true;
    };
  }, [step, serviceId, memberId, weekStart, weekIndex, slug, today]);

  // Il conto alla rovescia per chiedere un nuovo codice.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const open = (next: Step) => {
    setStep(next);
    setAlert(null);
    window.setTimeout(() => document.getElementById("prenota-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const chooseService = (id: string) => {
    setServiceId(id);
    setStartMin(null);
    setPickedDate(null);
    setWeekIndex(0);
    setWeekReady(false);
    open("when");
  };

  const chooseTime = (date: string, min: number) => {
    setPickedDate(date);
    setStartMin(min);
    open("data");
  };

  const chooseMember = (id: string | null) => {
    setMemberId(id);
    setStartMin(null);
    setWeekReady(false);
  };

  const payload = () => ({ slug, serviceId: serviceId!, memberId, date: pickedDate!, startMin: startMin!, name, email, phone: phoneNumber, privacy, marketing, website });

  const failureAlert = (r: Failure): Alert => ({ message: r.error, alternatives: r.kind === "conflict" ? r.alternatives : undefined });

  const send = () => {
    setPrivacyTried(true);
    setEmailTouched(true);
    if (!name.trim()) return setAlert({ message: copy.errors.name });
    if (!isEmail(email.trim())) return;
    if (!privacy) return;
    setAlert(null);
    startBusy(async () => {
      try {
        const r = await requestCode(payload());
        if (r.ok) {
          setCode("");
          setCooldown(60);
          return open("code");
        }
        setAlert(failureAlert(r));
        if (r.kind === "wait" && r.waitSeconds) setCooldown(r.waitSeconds);
      } catch {
        setAlert({ message: copy.errors.network });
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
        setAlert({ message: copy.errors.network });
      }
    });

  const confirm = (value: string, override?: { date: string; startMin: number }) =>
    startBusy(async () => {
      setAlert(null);
      try {
        const r = await confirmCode({ slug, email, code: value, override });
        if (r.ok) {
          setConfirmed(r);
          return open("done");
        }
        setAlert(failureAlert(r));
        if (r.kind === "code") setCode("");
      } catch {
        setAlert({ message: copy.errors.network });
      }
    });

  const onCode = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !busy) confirm(digits);
  };

  const pickAlternative = (a: Alternative) => {
    setPickedDate(a.date);
    setStartMin(a.startMin);
    setAlert(null);
    if (step === "code" && code.length === 6) confirm(code, a);
    else if (step !== "code") open("data");
  };

  const restart = () => {
    setStep("service");
    setServiceId(null);
    setStartMin(null);
    setPickedDate(null);
    setCode("");
    setConfirmed(null);
    setAlert(null);
    setPrivacyTried(false);
    setWeekReady(false);
  };

  const emailBad = emailTouched && email.trim() !== "" && !isEmail(email.trim());
  const doneCount = (service ? 1 : 0) + (startMin !== null ? 1 : 0) + (step === "code" || step === "done" ? 1 : 0);
  const sum1 = service ? `${service.name} · ${span(service.durationMin)}${showPrices ? ` · ${formatPrice(service.priceCents)}` : ""}` : "";
  const sum2 = startMin !== null && pickedDate ? `${dayText(pickedDate)} · ${formatMinutes(startMin)}${member && multiple ? ` · con ${member.name}` : ""}` : "";
  const sum3 = step === "code" ? `${name.trim()} · ${email.trim()}` : "";
  const dataDone = step === "code";

  const stepHead = (n: number, title: string, summary: string, state: "idle" | "active" | "done", onChange?: () => void) => (
    <div className={styles.stepHead}>
      <span className={`${styles.num} ${state === "active" ? styles.numActive : ""} ${state === "done" ? styles.numDone : ""}`} aria-hidden="true">
        {state === "done" ? "✓" : n}
      </span>
      <span className={styles.stepText}>
        <span className={state === "idle" ? `${styles.stepTitle} ${styles.stepTitleIdle}` : styles.stepTitle}>{title}</span>
        {summary ? <span className={styles.summary} title={summary}>{summary}</span> : null}
      </span>
      {summary && onChange ? (
        <button type="button" className={styles.change} onClick={onChange} aria-label={`${copy.change}: ${title}`}>
          {copy.change}
        </button>
      ) : null}
    </div>
  );

  const panel = (isOpen: boolean, children: ReactNode, label: string) => (
    <div className={isOpen ? `${styles.panel} ${styles.panelOpen}` : styles.panel} inert={!isOpen} role="region" aria-label={label}>
      <div className={styles.panelClip}>
        <div className={styles.panelBody}>{children}</div>
      </div>
    </div>
  );

  const alertBox = (forStep: Step) => alert && step === forStep ? (
    <div className={styles.alert} role="alert">
      <span>{alert.message}</span>
      {alert.alternatives ? <span>{copy.errors.takenText(alert.alternatives.length > 0)}</span> : null}
      {alert.alternatives && alert.alternatives.length > 0 ? (
        <div className={styles.pills}>
          {alert.alternatives.map((a) => (
            <button key={`${a.date}-${a.startMin}`} type="button" className={styles.pill} style={{ paddingLeft: 14 }} onClick={() => pickAlternative(a)}>
              {dayText(a.date)} · {formatMinutes(a.startMin)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  const weekLabel = `${dayNumber(weekStart)} ${monthShort(weekStart)} – ${dayNumber(addDays(weekStart, 6))} ${monthShort(addDays(weekStart, 6))}`;
  const who = member && multiple ? ` con ${member.name}` : "";

  return (
    <div className={styles.card} id="prenota-card">
      {step !== "done" ? (
        <>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>{copy.book}</h3>
            <span className={styles.count}>{copy.doneCount(doneCount)}</span>
          </div>

          {/* 1 · Servizio */}
          <div className={styles.step}>
            {stepHead(1, copy.steps.service, step !== "service" ? sum1 : "", step === "service" ? "active" : "done", () => open("service"))}
            {panel(
              step === "service",
              <div className={styles.services}>
                {services.map((s) => (
                  <button key={s.id} type="button" className={styles.service} aria-pressed={s.id === serviceId} onClick={() => chooseService(s.id)}>
                    <span className={styles.serviceText}>
                      <span className={styles.serviceName}>{s.name}</span>
                      <span className={styles.serviceMeta}>{span(s.durationMin)}</span>
                    </span>
                    {showPrices ? <span className={styles.servicePrice}>{formatPrice(s.priceCents)}</span> : null}
                    <span className={styles.chevron} aria-hidden="true">›</span>
                  </button>
                ))}
              </div>,
              copy.steps.service,
            )}
          </div>

          {/* 2 · Giorno e ora */}
          <div className={styles.step}>
            {stepHead(2, copy.steps.when, step === "data" || step === "code" ? sum2 : "", step === "when" ? "active" : startMin !== null ? "done" : "idle", () => open("when"))}
            {panel(
              step === "when",
              <>
                {multiple ? (
                  <div className={styles.group}>
                    <span className={styles.label}>{copy.with}</span>
                    <div className={styles.pills}>
                      <button type="button" className={styles.pill} aria-pressed={memberId === null} onClick={() => chooseMember(null)}>
                        <span className={styles.avatar} aria-hidden="true">★</span>
                        <span>Chiunque</span>
                      </button>
                      {members.map((m) => (
                        <button key={m.id} type="button" className={styles.pill} aria-pressed={memberId === m.id} onClick={() => chooseMember(m.id)}>
                          <span className={styles.avatar} aria-hidden="true">{initial(m.name)}</span>
                          <span>{m.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {quick.length > 0 && weekIndex === 0 ? (
                  <div className={styles.group}>
                    <span className={styles.label}>{copy.firstSlots}</span>
                    <div className={styles.quick}>
                      {quick.map((q) => (
                        <button key={`${q.date}-${q.startMin}`} type="button" className={styles.freeButton} onClick={() => chooseTime(q.date, q.startMin)}>
                          <span className={styles.freeDay}>{q.date === today ? "Oggi" : dayText(q.date)}</span>
                          <span className={styles.freeTime}>{formatMinutes(q.startMin)}</span>
                          {member && multiple ? <span className={styles.freeWho}>con {member.name}</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className={styles.group} aria-busy={loading}>
                  <div className={styles.weekNav}>
                    <button type="button" className={styles.weekButton} disabled={weekIndex === 0} aria-label="Settimana precedente" onClick={() => setWeekIndex((w) => w - 1)}>‹</button>
                    <span className={styles.weekLabel}>{weekLabel}</span>
                    <button type="button" className={styles.weekButton} disabled={!hasNext} aria-label="Settimana successiva" onClick={() => setWeekIndex((w) => w + 1)}>›</button>
                  </div>
                  <div className={styles.days}>
                    {days.map((d) => {
                      const free = (slotsByDate.get(d)?.length ?? 0) > 0;
                      return (
                        <button
                          key={d}
                          type="button"
                          className={styles.day}
                          disabled={!free}
                          aria-pressed={free && d === activeDate}
                          aria-label={`${dayText(d)}${free ? "" : ", nessun orario libero"}`}
                          onClick={() => setPickedDate(d)}
                        >
                          <span className={styles.dow}>{SHORT_DAY[weekdayOf(d)]}</span>
                          <span className={styles.dayNum} data-off={!free}>{dayNumber(d)}</span>
                          <span className={styles.dot} data-free={free} />
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.legend}>
                    <span className={styles.legendItem}><span className={styles.dot} data-free="true" />{copy.free}</span>
                  </div>
                </div>

                {activeDate && activeSlots.length > 0 ? (
                  <div className={styles.group}>
                    <span className={styles.slotsTitle}>{dayText(activeDate)}</span>
                    <div className={styles.slots}>
                      {activeSlots.map((s) => (
                        <button key={s.startMin} type="button" className={styles.slot} aria-pressed={startMin === s.startMin && pickedDate === activeDate} onClick={() => chooseTime(activeDate, s.startMin)}>
                          {formatMinutes(s.startMin)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {weekReady && !loading && !anyFree ? (
                  <div className={styles.notice}>
                    {weekIndex === 0 && hasNext ? (
                      <>
                        <span className={styles.noticeTitle}>{copy.noSlotsWeek}</span>
                        <div className={styles.noticeActions}>
                          <button type="button" className={styles.secondary} onClick={() => setWeekIndex(1)}>Vedi la settimana dopo</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className={styles.noticeTitle}>{copy.noSlotsTwoWeeks(who)}</span>
                        <span className={styles.noticeText}>{copy.callUs}</span>
                        <div className={styles.noticeActions}>
                          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={styles.primary}>{copy.call(phone)}</a>
                          {memberId ? <button type="button" className={styles.secondary} onClick={() => chooseMember(null)}>{copy.anyone}</button> : null}
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
                {alertBox("when")}
              </>,
              copy.steps.when,
            )}
          </div>

          {/* 3 · I tuoi dati, poi il codice */}
          <div className={styles.step}>
            {stepHead(3, copy.steps.data, sum3, dataDone ? "done" : step === "data" ? "active" : "idle", dataDone ? () => open("data") : undefined)}
            {panel(
              step === "data",
              <>
                {alertBox("data")}
                <div className={styles.field}>
                  <label htmlFor="bk-name" className={styles.label}>{copy.name}</label>
                  <input id="bk-name" className={styles.input} autoComplete="name" enterKeyHint="next" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="bk-mail" className={styles.label}>{copy.email}</label>
                  <input
                    id="bk-mail"
                    className={styles.input}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="next"
                    maxLength={120}
                    placeholder="nome@esempio.it"
                    value={email}
                    aria-invalid={emailBad}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                  />
                  {emailBad ? <span className={styles.error}>{copy.emailError}</span> : null}
                </div>
                <div className={styles.field}>
                  <label htmlFor="bk-tel" className={styles.label}>
                    {copy.phone} <span className={styles.hint}>· {copy.phoneHint}</span>
                  </label>
                  <input id="bk-tel" className={styles.input} type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="done" maxLength={20} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </div>
                {/* trappola per i programmi: le persone non lo vedono */}
                <input className="visually-hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: "-9999px" }} />
                <div className={styles.check}>
                  <button type="button" role="checkbox" aria-checked={privacy} aria-labelledby="bk-privacy" className={styles.box} data-on={privacy} data-bad={privacyTried && !privacy} onClick={() => setPrivacy((v) => !v)}>
                    {privacy ? "✓" : ""}
                  </button>
                  <span id="bk-privacy" className={styles.checkText} onClick={() => setPrivacy((v) => !v)}>
                    {copy.privacyBefore}
                    <a href={privacyHref} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{copy.privacyLink}</a> {copy.privacyAfter}
                  </span>
                </div>
                {privacyTried && !privacy ? <span className={styles.error}>{copy.privacyError}</span> : null}
                <div className={styles.check}>
                  <button type="button" role="checkbox" aria-checked={marketing} aria-labelledby="bk-marketing" className={styles.box} data-on={marketing} onClick={() => setMarketing((v) => !v)}>
                    {marketing ? "✓" : ""}
                  </button>
                  <span id="bk-marketing" className={styles.checkText} onClick={() => setMarketing((v) => !v)}>
                    {copy.marketing} <span className={styles.hint}>{copy.marketingHint}</span>
                  </span>
                </div>
                <button type="button" className={styles.primary} disabled={busy} onClick={send}>
                  {busy ? copy.sending : copy.book}
                </button>
                <p className={styles.fine}>{copy.codeNote}</p>
              </>,
              copy.steps.data,
            )}
            {panel(
              step === "code",
              <>
                <h3 className={styles.codeTitle}>{copy.codeTitle}</h3>
                <span className={styles.codeText}>
                  {copy.codeSentBefore}
                  <strong>{email.trim()}</strong>
                  {copy.codeSentAfter}
                </span>
                {alertBox("code")}
                <input
                  id="bk-code"
                  className={styles.code}
                  aria-label={copy.codeLabel}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  enterKeyHint="done"
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => onCode(e.target.value)}
                />
                <div className={styles.codeLinks}>
                  <button type="button" className={styles.link} onClick={() => open("data")}>{copy.wrongEmail}</button>
                  <button type="button" className={styles.link} disabled={cooldown > 0 || busy} onClick={resend}>
                    {cooldown > 0 ? copy.resendIn(cooldown) : copy.resend}
                  </button>
                </div>
              </>,
              copy.codeTitle,
            )}
          </div>
        </>
      ) : confirmed ? (
        <div className={styles.done} role="status">
          <span className={styles.tick} aria-hidden="true">✓</span>
          <h3 className={styles.cardTitle}>{copy.seeYou(confirmed.seeYou)}</h3>
          <div className={styles.rows}>
            {confirmed.rows.map((r) => (
              <div key={r.label} className={styles.row}>
                <span className={styles.rowLabel}>{r.label}</span>
                <strong className={styles.rowValue}>{r.value}</strong>
              </div>
            ))}
          </div>
          <span className={styles.doneNote}>
            {copy.summarySent(confirmed.email)} {confirmed.cancelUntil ? `Annulli gratis fino a ${confirmed.cancelUntil}.` : `Per spostare o annullare chiama lo ${phone}.`}
          </span>
          <div className={styles.doneActions}>
            <a href={`${confirmed.manageUrl}/calendario.ics`} className={styles.primary}>{copy.addCalendar}</a>
            <button type="button" className={styles.secondary} onClick={restart}>{copy.again}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
