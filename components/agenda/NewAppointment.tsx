"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, Field, useIsDesktop, useToast } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import avatarStyles from "@/components/ui/Avatar.module.css";
import { useDialog } from "@/components/ui/useDialog";
import { agendaCopy } from "@/lib/copy/agenda";
import { createAppointment, listSlots, walkIn, type Alternative, type Conflict, type Created, type SlotsResult } from "@/lib/agenda/actions";
import type { ClientOption, ServiceOption } from "@/lib/agenda/load";
import { setClientPhoto } from "@/lib/clients/photo";
import { resizePhoto } from "@/lib/clients/resizeImage";
import { formatPrice } from "@/lib/dates/format";
import { addDays, dayNumber, monthShort, romeMinutes, weekdayShort } from "@/lib/dates/rome";
import { clock, type Operator } from "@/lib/rules/agenda";
import { AVATAR_COLOR_NAMES, clientInitials } from "@/lib/rules/avatar";
import { LIMITS } from "@/lib/rules/forms";
import { eurosText, parseEuros, quickPrices } from "@/lib/rules/price";
import { offlineCopy } from "@/lib/copy/offline";
import { useOnline } from "@/lib/offline/hooks";
import { offlineSlots } from "@/lib/offline/slots";
import { useAgenda } from "./AgendaProvider";
import { MonthCalendar } from "./MonthCalendar";
import { OperatorAvatar } from "./OperatorAvatar";
import dialogs from "./Dialogs.module.css";
import styles from "./Flow.module.css";

const copy = agendaCopy.form;
const flow = agendaCopy.flow;

export type Prefill = { date?: string; memberId?: string | null; startMin?: number; clientId?: string | null; serviceId?: string | null; newName?: string | null };

type Props = {
  mode: "new" | "walkin";
  prefill?: Prefill;
  operators: Operator[];
  services: ServiceOption[];
  clients: ClientOption[];
  /** Giorni di chiusura del salone (dalla striscia dell'agenda): nella fila dei giorni sono spenti. */
  closedDates: string[];
  today: string;
  selectedDate: string;
  onClose: () => void;
  onCreated: (created: Created) => void;
  /** Fatto senza rete: messo in coda, parte quando torna. */
  onQueued: () => void;
};

/** Quanti clienti si propongono senza che si scriva niente, e quanti con una ricerca. */
const SUGGESTED_CLIENTS = 3;
const SEARCH_RESULTS = 8;
/** Quanti giorni a portata di dito, da oggi. */
const DAYS_SHOWN = 14;
/** Mattina e pomeriggio si dividono alle 13. */
const NOON = 13 * 60;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** `Ven 30 ott` */
export const shortDate = (date: string) => `${weekdayShort(date)} ${dayNumber(date)} ${monthShort(date)}`;

/** Etichetta breve di un giorno: "Oggi", "Domani", "Ven 30 ott" (la usano la conferma e «Sposta»). */
export function dayLabel(date: string, today: string, tomorrow: string): string {
  return date === today ? copy.today : date === tomorrow ? copy.tomorrow : shortDate(date);
}

/**
 * «Nuovo appuntamento» e «Cliente in negozio»: una schermata sola con quattro blocchi sempre aperti
 * (Quando, Cosa, Con chi, Per chi) e il riepilogo con «Fissa l'appuntamento» in fondo.
 * Su telefono occupa tutto lo schermo (il tasto indietro la chiude); su desktop è un pannello a destra.
 */
export function NewAppointment({ mode, prefill, operators, services, clients, closedDates, today, selectedDate, onClose, onCreated, onQueued }: Props) {
  const online = useOnline();
  const toast = useToast();
  const desktop = useIsDesktop();
  const { offlineDay, queueCreate } = useAgenda();
  const walkInMode = mode === "walkin";
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(() => (prefill?.clientId && clients.some((c) => c.id === prefill.clientId) ? prefill.clientId : null));
  const [newMode, setNewMode] = useState(() => !prefill?.clientId && prefill?.newName !== undefined && prefill?.newName !== null);
  const [newName, setNewName] = useState(prefill?.newName ?? "");
  const [newPhone, setNewPhone] = useState("");
  const [newColor, setNewColor] = useState(0);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [serviceId, setServiceId] = useState(() => (prefill?.serviceId && services.some((s) => s.id === prefill.serviceId) ? prefill.serviceId : (services[0]?.id ?? "")));
  const [memberId, setMemberId] = useState<string | "any">(prefill?.memberId ?? "any");
  const [date, setDate] = useState(prefill?.date ?? selectedDate);
  const [startMin, setStartMin] = useState<number | null>(prefill?.startMin ?? null);
  const [calOpen, setCalOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceCents, setPriceCents] = useState<number | null>(null); // null = prezzo di listino
  const [priceText, setPriceText] = useState("");
  const [priceNote, setPriceNote] = useState("");
  const [slots, setSlots] = useState<SlotsResult | null>(null);
  const [loadingSlots, startSlots] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<{ message: string; conflict?: Conflict } | null>(null);
  const [nowText] = useState(() => clock(romeMinutes(new Date())));
  const clientBlock = useRef<HTMLElement>(null);
  const leaveByBack = useRef(false);

  // dismiss: chiusura voluta (Annulla, X, Esc, clic fuori). Su telefono toglie anche la voce messa nella cronologia.
  const dismiss = () => {
    leaveByBack.current = true;
    onClose();
  };
  const { ref } = useDialog(true, dismiss, 0);

  // su telefono la schermata è una «pagina»: il tasto indietro la chiude
  useEffect(() => {
    if (desktop) return;
    history.pushState({ tgFlow: true }, "");
    const onPop = () => {
      leaveByBack.current = false;
      onClose();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (leaveByBack.current && (history.state as { tgFlow?: boolean } | null)?.tgFlow) history.back();
    };
    // solo all'apertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop]);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const service = services.find((s) => s.id === serviceId);
  const client = clients.find((c) => c.id === clientId);
  const operatorName = memberId === "any" ? null : operators.find((o) => o.id === memberId)?.name;
  const closed = useMemo(() => new Set(closedDates), [closedDates]);
  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i)), [today]);
  const outside = !days.includes(date);

  // Senza rete gli orari si ricavano dalla fotografia del giorno: solo quel giorno, senza chiedere al server.
  const offlineResult: SlotsResult | null = !online && service ? (date === offlineDay.date ? { closed: offlineDay.hours.closed, durationMin: service.durationMin, slots: offlineSlots(offlineDay, service.durationMin, memberId === "any" ? null : memberId, 0) } : { closed: false, durationMin: service.durationMin, slots: [] }) : null;

  // Gli orari liberi si ricaricano quando cambia servizio, barbiere o giorno.
  useEffect(() => {
    if (!online || walkInMode || !serviceId) return;
    let cancelled = false;
    startSlots(async () => {
      const result = await listSlots({ serviceId, memberId: memberId === "any" ? null : memberId, date });
      if (cancelled) return;
      setSlots(result);
      setStartMin((current) => (current !== null && result.slots.some((s) => s.startMin === current && s.free) ? current : null));
    });
    return () => {
      cancelled = true;
    };
  }, [online, walkInMode, serviceId, memberId, date]);

  const matches = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return clients.slice(0, SUGGESTED_CLIENTS);
    const digits = q.replace(/\D/g, "");
    return clients.filter((c) => norm(c.name).includes(q) || (digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").endsWith(digits))).slice(0, SEARCH_RESULTS);
  }, [clients, query]);

  const shown = online ? slots : offlineResult;
  const timeGroups = [
    { title: flow.morning, slots: shown?.slots.filter((x) => x.startMin < NOON) ?? [] },
    { title: flow.afternoon, slots: shown?.slots.filter((x) => x.startMin >= NOON) ?? [] },
  ].filter((g) => g.slots.length > 0);

  // prezzo: quello di listino, o quello fatto per questo cliente
  const listCents = service?.priceCents ?? 0;
  const finalCents = priceCents ?? listCents;
  const changed = service !== undefined && finalCents !== listCents;

  const hasClient = clientId !== null || (newMode && newName.trim().length > 0);
  const clientLabel = client?.name ?? (newMode && newName.trim() ? newName.trim() : flow.pickClient);
  const canSave = hasClient && Boolean(service) && (walkInMode ? online : startMin !== null) && !saving;

  const whenLabel = walkInMode ? flow.nowSummary(nowText) : startMin !== null ? `${shortDate(date)} · ${clock(startMin)}` : flow.pickWhen;
  const priceLabel = changed ? flow.instead(formatPrice(finalCents), formatPrice(listCents)) : formatPrice(finalCents);
  const subLabel = service ? `${service.name} · ${service.durationMin} min · ${priceLabel} · con ${operatorName ?? flow.anyoneSummary}` : "";

  const pickTime = (min: number) => {
    setStartMin(min);
    // scelto l'orario, si passa da soli ai blocchi che mancano
    if (!hasClient) window.setTimeout(() => clientBlock.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const pickPrice = (cents: number) => {
    setPriceCents(cents === listCents ? null : cents);
    setPriceText(eurosText(cents));
  };
  const typePrice = (text: string) => {
    setPriceText(text);
    const cents = parseEuros(text);
    setPriceCents(cents === null || cents === listCents ? null : cents);
  };

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const blob = await resizePhoto(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      toast(flow.photoAdded, flow.photoAddedSub);
    } catch {
      toast(flow.photoError);
    }
  };

  const save = () =>
    startSave(async () => {
      setError(null);
      const extra = priceCents !== null ? { priceCents, priceNote: priceNote.trim() || null } : {};
      const who = clientId ? { clientId } : { newClient: { name: newName.trim(), phone: newPhone.trim() || null, avatarColor: newColor } };
      if (!online && !walkInMode) {
        // Niente rete: si mette in coda e parte appena torna (la foto no: si può aggiungere dopo dalla scheda).
        queueCreate({ ...who, ...extra, serviceId, memberId: memberId === "any" ? null : memberId, date, startMin: startMin ?? 0 }, { client: client?.name ?? newName.trim(), service: service?.name ?? "" });
        return onQueued();
      }
      const result = walkInMode
        ? await walkIn({ ...who, ...extra, serviceId, memberId: memberId === "any" ? null : memberId })
        : await createAppointment({ ...who, ...extra, serviceId, memberId: memberId === "any" ? null : memberId, date, startMin: startMin ?? 0 });
      if (!result.ok) return setError({ message: result.error, conflict: result.conflict });
      if (photo && !clientId) {
        const form = new FormData();
        form.set("photo", new File([photo.blob], "foto.jpg", { type: "image/jpeg" }));
        await setClientPhoto(result.clientId, form).catch(() => null);
      }
      // l'appuntamento è fatto: la voce messa nella cronologia resta com'è, senza tornare indietro
      leaveByBack.current = false;
      onCreated(result);
    });

  const pickAlternative = (alt: Alternative) => {
    setDate(alt.date);
    setStartMin(alt.startMin);
    if (memberId !== "any") setMemberId(alt.memberId);
    setError(null);
  };

  const showAvatarPreview = newMode && !clientId;
  const previewName = newName.trim();

  return (
    <dialog ref={ref} className={styles.flow} aria-labelledby="flow-title" data-dialog="nuovo">
      <header className={styles.bar}>
        <button type="button" className={styles.barCancel} onClick={dismiss}>
          {copy.cancel}
        </button>
        <h2 id="flow-title" className={styles.title}>
          {walkInMode ? copy.titleWalkIn : copy.titleNew}
        </h2>
        <button type="button" className={styles.barClose} onClick={dismiss} aria-label={flow.close}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className={styles.scroll}>
        {error ? (
          <div className={dialogs.alert} role="alert">
            <p className={dialogs.alertTitle}>{error.conflict?.title ?? error.message}</p>
            {error.conflict ? <p>{error.conflict.text}</p> : null}
            {error.conflict && error.conflict.alternatives.length > 0 ? (
              <div className={dialogs.chips}>
                {error.conflict.alternatives.map((a) => (
                  <button key={`${a.date}-${a.startMin}`} type="button" className={dialogs.chip} onClick={() => pickAlternative(a)}>
                    {dayLabel(a.date, today, "")} · {clock(a.startMin)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <section className={styles.block} data-block="quando" aria-labelledby="fl-quando">
          <div className={styles.blockHead}>
            <span className={styles.num} aria-hidden="true">
              1
            </span>
            <h3 className={styles.blockTitle} id="fl-quando">
              {flow.when}
            </h3>
          </div>
          {walkInMode ? (
            <p className={styles.now}>
              <span className={styles.stepBadge}>{flow.nowBadge}</span>
              <span className={styles.nowText}>{flow.startNow(nowText)}</span>
            </p>
          ) : (
            <>
              <div className={dialogs.whenDays}>
                <button
                  type="button"
                  className={cx(dialogs.calButton, styles.Dialogs_calButton, (calOpen || outside) && dialogs.calButtonOn, (calOpen || outside) && styles.Dialogs_calButtonOn)}
                  aria-label={flow.openCalendar}
                  aria-expanded={calOpen}
                  onClick={() => setCalOpen(!calOpen)}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15" rx="3" />
                    <path d="M8 3v4M16 3v4M3.5 10h17" />
                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
                  </svg>
                  {outside ? <span className={dialogs.calButtonDate}>{`${dayNumber(date)} ${monthShort(date)}`}</span> : null}
                </button>
                <div className={cx(dialogs.days, styles.Dialogs_days)} role="group" aria-label={flow.day}>
                  {days.map((d) => {
                    const on = d === date;
                    return (
                      <button
                        key={d}
                        type="button"
                        className={cx(on ? dialogs.dayButtonOn : dialogs.dayButton, on ? styles.Dialogs_dayButtonOn : styles.Dialogs_dayButton)}
                        aria-pressed={on}
                        aria-label={`${weekdayShort(d)} ${dayNumber(d)}`}
                        disabled={closed.has(d)}
                        onClick={() => {
                          setDate(d);
                          setCalOpen(false);
                        }}
                      >
                        <span className={cx(dialogs.dayDow, styles.Dialogs_dayDow)}>{weekdayShort(d)}</span>{" "}
                        <span className={cx(dialogs.dayNum, styles.Dialogs_dayNum)}>{dayNumber(d)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={cx(dialogs.whenCal, styles.Dialogs_whenCal)} hidden={!calOpen}>
                {calOpen ? (
                  <MonthCalendar
                    mode="book"
                    heading="h4"
                    monthsClassName={dialogs.Calendar_months}
                    selected={date}
                    today={today}
                    onSelect={(d) => {
                      setDate(d);
                      setCalOpen(false);
                    }}
                  />
                ) : null}
              </div>
              <div className={cx(dialogs.whenTimes, styles.Dialogs_whenTimes)} hidden={calOpen}>
                <p className={cx(dialogs.hint, styles.Dialogs_hint)} aria-live="polite">
                  {!online && date !== offlineDay.date
                    ? offlineCopy.onlyDay(dayLabel(offlineDay.date, today, ""))
                    : online && loadingSlots && !shown
                      ? "…"
                      : shown?.closed
                        ? copy.closed
                        : timeGroups.length === 0 && shown
                          ? copy.noSlots
                          : flow.slotsHint(operatorName ?? copy.anyone, shortDate(date))}
                </p>
                {timeGroups.map((g) => (
                  <div key={g.title} className={cx(dialogs.timeGroup, styles.Dialogs_timeGroup)}>
                    <p className={cx(dialogs.timeGroupTitle, styles.Dialogs_timeGroupTitle)}>{g.title}</p>
                    <div className={cx(dialogs.times, styles.Dialogs_times)} role="group" aria-label={g.title} aria-busy={online && loadingSlots}>
                      {g.slots.map((x) => (
                        <button
                          key={x.startMin}
                          type="button"
                          disabled={!x.free}
                          aria-pressed={startMin === x.startMin}
                          className={cx(startMin === x.startMin ? dialogs.chipOn : x.free ? dialogs.chip : dialogs.chipOff, dialogs.time, styles.Dialogs_time, startMin === x.startMin && styles.Dialogs_chipOn, startMin !== x.startMin && !x.free && styles.Dialogs_chipOff, startMin !== x.startMin && x.free && styles.Dialogs_chip)}
                          onClick={() => pickTime(x.startMin)}
                        >
                          {clock(x.startMin)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className={styles.block} data-block="cosa" aria-labelledby="fl-cosa">
          <div className={styles.blockHead}>
            <span className={styles.num} aria-hidden="true">
              2
            </span>
            <h3 className={styles.blockTitle} id="fl-cosa">
              {flow.what}
            </h3>
          </div>
          <div className={styles.cards} role="group" aria-label={flow.service}>
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                className={cx(styles.card, s.id === serviceId && styles.cardOn)}
                aria-pressed={s.id === serviceId}
                onClick={() => {
                  setServiceId(s.id);
                  // un prezzo fatto a mano vale per il servizio scelto: cambiando servizio si torna al listino
                  setPriceCents(null);
                  setPriceText("");
                }}
              >
                <span className={styles.cardName}>{s.name}</span>
                <span className={styles.cardSub}>
                  {s.durationMin} min · {formatPrice(s.priceCents)}
                </span>
              </button>
            ))}
          </div>
          {service ? (
            <>
              <div className={cx(styles.price, changed && styles.priceChanged)}>
                <span className={styles.priceLabel}>{flow.price}</span>
                <span className={styles.priceValue}>
                  <span className={styles.priceOld} hidden={!changed}>
                    {formatPrice(listCents)}
                  </span>
                  <strong>{formatPrice(finalCents)}</strong>
                </span>
                <button
                  type="button"
                  className={styles.priceEdit}
                  aria-label={flow.changePrice}
                  title={flow.changePrice}
                  aria-expanded={priceOpen}
                  aria-controls="fl-prezzo"
                  onClick={() => {
                    if (!priceOpen && priceText === "") setPriceText(eurosText(finalCents));
                    setPriceOpen(!priceOpen);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                    <path d="m13.5 6.5 4 4" />
                  </svg>
                </button>
              </div>
              <div className={styles.priceEditor} id="fl-prezzo" hidden={!priceOpen}>
                <div className={styles.quicks} role="group" aria-label={flow.quick}>
                  {quickPrices(listCents).map((q) => (
                    <button key={q.key} type="button" className={cx(styles.quick, finalCents === q.cents && styles.quickOn)} aria-pressed={finalCents === q.cents} onClick={() => pickPrice(q.cents)}>
                      {q.label}
                    </button>
                  ))}
                </div>
                <div className={styles.priceFields}>
                  <Field size="large" label={flow.priceField} inputMode="decimal" value={priceText} onChange={(e) => typePrice(e.target.value)} />
                  <Field size="large" label={flow.noteField} maxLength={60} value={priceNote} placeholder={flow.notePlaceholder} onChange={(e) => setPriceNote(e.target.value)} />
                </div>
                <p className={cx(dialogs.hint)}>{flow.priceHint}</p>
              </div>
            </>
          ) : null}
        </section>

        {operators.length > 1 ? (
          <section className={styles.block} data-block="conchi" aria-labelledby="fl-conchi">
            <div className={styles.blockHead}>
              <span className={styles.num} aria-hidden="true">
                3
              </span>
              <h3 className={styles.blockTitle} id="fl-conchi">
                {flow.withWhom}
              </h3>
            </div>
            <div className={styles.people} role="group" aria-label={flow.barber}>
              <button type="button" className={cx(styles.person, memberId === "any" && styles.personOn)} aria-pressed={memberId === "any"} onClick={() => setMemberId("any")}>
                <span className={styles.personAv}>
                  <span className={styles.anyAv} aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="9" cy="9" r="3" />
                      <circle cx="16.5" cy="10.5" r="2.5" />
                      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M14.5 15.5c2.6-.6 5 .8 6 3.5" />
                    </svg>
                  </span>
                </span>
                <span className={styles.personName}>{copy.anyone}</span>
                <span className={styles.personSub}>{flow.anyoneSub}</span>
              </button>
              {operators.map((o, i) => (
                <button key={o.id} type="button" className={cx(styles.person, memberId === o.id && styles.personOn)} aria-pressed={memberId === o.id} onClick={() => setMemberId(o.id)}>
                  <span className={styles.personAv}>
                    <OperatorAvatar name={o.name} colorIndex={i} className={styles.avBig} />
                  </span>
                  <span className={styles.personName}>{o.name}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section ref={clientBlock} className={styles.block} data-block="cliente" aria-labelledby="fl-cliente">
          <div className={styles.blockHead}>
            <span className={styles.num} aria-hidden="true">
              {operators.length > 1 ? 4 : 3}
            </span>
            <h3 className={styles.blockTitle} id="fl-cliente">
              {flow.forWhom}
            </h3>
          </div>
          <Field
            size="large"
            label={flow.searchClient}
            labelClassName={dialogs.srOnly}
            boxClassName={dialogs.searchBox}
            placeholder={flow.searchClient}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leading={
              <svg className={dialogs.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m20 20-4.2-4.2" />
              </svg>
            }
          />
          <div className={styles.people} role="group" aria-label={flow.savedClients}>
            <button
              type="button"
              className={cx(styles.person, newMode && !clientId && styles.personOn)}
              aria-pressed={newMode && !clientId}
              onClick={() => {
                setClientId(null);
                setNewMode(true);
                setNewName((n) => n || query.trim());
              }}
            >
              <span className={styles.personAv}>
                <span className={styles.newAv} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </span>
              <span className={styles.personName}>{flow.newShort}</span>
              <span className={styles.personSub}>{flow.newSub}</span>
            </button>
            {matches.map((c) => {
              const [first, ...rest] = c.name.trim().split(/\s+/);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={cx(styles.person, clientId === c.id && styles.personOn)}
                  aria-pressed={clientId === c.id}
                  onClick={() => {
                    setClientId(c.id);
                    setNewMode(false);
                  }}
                >
                  <span className={styles.personAv}>
                    <Avatar name={c.name} color={c.avatarColor} photoUrl={c.photoUrl} size="md" className={styles.avBig} />
                  </span>
                  <span className={styles.personName}>{first}</span>
                  {rest.length > 0 ? <span className={styles.personSub}>{rest.join(" ")}</span> : null}
                </button>
              );
            })}
          </div>
          {query.trim() && matches.length === 0 ? <p className={dialogs.hint}>{copy.noClients}</p> : null}
          <div className={styles.newClient} hidden={!showAvatarPreview}>
            <div className={avatarStyles.picker}>
              <Avatar name={previewName || "+"} color={newColor} photoUrl={photo?.url} size="lg" text={previewName ? clientInitials(previewName) : "+"} />
              <div className={avatarStyles.pickerSide}>
                <label className={avatarStyles.photoButton} htmlFor="foto-nuovo">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
                    <circle cx="12" cy="12.5" r="3.5" />
                  </svg>
                  <span>{flow.addPhoto}</span>
                </label>
                <input id="foto-nuovo" className={avatarStyles.fileInput} type="file" accept="image/*" capture="user" onChange={(e) => void choosePhoto(e.target.files?.[0])} />
                <div className={avatarStyles.swatches} role="group" aria-label={flow.colorGroup}>
                  {AVATAR_COLOR_NAMES.map((n, i) => (
                    <button
                      key={n}
                      type="button"
                      className={cx(avatarStyles.swatch, avatarStyles[`c${i}` as "c0"], newColor === i && avatarStyles.swatchOn)}
                      aria-pressed={newColor === i}
                      aria-label={n}
                      onClick={() => setNewColor(i)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className={dialogs.pair}>
              <Field size="large" label={copy.name} maxLength={LIMITS.clientName} value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Field size="large" label={`${copy.phone} · ${copy.phoneHint}`} type="tel" inputMode="tel" maxLength={LIMITS.phone} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>
            <button
              type="button"
              className={dialogs.linkButton}
              onClick={() => {
                setNewMode(false);
                setNewName("");
                setNewPhone("");
                setPhoto(null);
              }}
            >
              {copy.change}
            </button>
          </div>
          {!online ? <p className={dialogs.hint}>{walkInMode ? offlineCopy.walkInNeedsNet : date !== offlineDay.date ? offlineCopy.onlyDay(dayLabel(offlineDay.date, today, "")) : offlineCopy.text(null)}</p> : null}
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.summary} aria-live="polite">
          <span className={styles.sumMain}>
            {whenLabel} · {clientLabel}
          </span>
          <span className={styles.sumSub}>{subLabel}</span>
        </div>
        <Button size="large" className={styles.confirm} disabled={!canSave} onClick={save}>
          {saving ? copy.saving : copy.save}
        </Button>
      </footer>
    </dialog>
  );
}
