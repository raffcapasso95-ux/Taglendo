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
import { createClientRecord } from "@/lib/clients/actions";
import { setClientPhoto } from "@/lib/clients/photo";
import { resizePhoto } from "@/lib/clients/resizeImage";
import { formatPrice } from "@/lib/dates/format";
import { dayNumber, monthShort, romeMinutes, weekdayShort } from "@/lib/dates/rome";
import { clock, operatorColor, type Operator } from "@/lib/rules/agenda";
import { AVATAR_COLOR_NAMES, clientInitials } from "@/lib/rules/avatar";
import { homonyms, normName, phoneTail, pickClients, sameName, visitLabel } from "@/lib/rules/clientPick";
import { LIMITS } from "@/lib/rules/forms";
import { clampDuration, DURATION_STEP, eurosText, parseEuros, quickDurations, quickPrices } from "@/lib/rules/price";
import { offlineCopy } from "@/lib/copy/offline";
import { useOnline } from "@/lib/offline/hooks";
import { offlineSlots } from "@/lib/offline/slots";
import { useAgenda } from "./AgendaProvider";
import { WhenPicker } from "./WhenPicker";
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
const SUGGESTED_CLIENTS = 5;
const SEARCH_RESULTS = 8;

/** `Ven 30 ott` */
export const shortDate = (date: string) => `${weekdayShort(date)} ${dayNumber(date)} ${monthShort(date)}`;

/** Etichetta breve di un giorno: "Oggi", "Domani", "Ven 30 ott" (la usano la conferma e «Sposta»). */
export function dayLabel(date: string, today: string, tomorrow: string): string {
  return date === today ? copy.today : date === tomorrow ? copy.tomorrow : shortDate(date);
}

/**
 * «Nuovo appuntamento» e «Cliente in negozio»: una schermata sola con quattro blocchi sempre aperti
 * (Cosa, Con chi, Quando, Per chi) e il riepilogo con «Fissa l'appuntamento» in fondo.
 * Prima il servizio e il barbiere, poi l'ora: gli orari mostrati sono quelli liberi per chi fa il servizio,
 * e con «Chiunque» ogni orario mostra chi è libero.
 * Su telefono occupa tutto lo schermo (il tasto indietro la chiude); su desktop è un pannello a destra.
 */
export function NewAppointment({ mode, prefill, operators, services, clients: savedClients, closedDates, today, selectedDate, onClose, onCreated, onQueued }: Props) {
  const online = useOnline();
  const toast = useToast();
  const desktop = useIsDesktop();
  const { offlineDay, queueCreate } = useAgenda();
  const walkInMode = mode === "walkin";
  // i clienti salvati qui con «Salva cliente» si aggiungono subito alla rubrica di questa schermata
  const [added, setAdded] = useState<ClientOption[]>([]);
  const clients = useMemo(() => [...added, ...savedClients.filter((c) => !added.some((a) => a.id === c.id))], [added, savedClients]);
  const [savingClient, startSaveClient] = useTransition();
  const [newError, setNewError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(() => (prefill?.clientId && clients.some((c) => c.id === prefill.clientId) ? prefill.clientId : null));
  const [newMode, setNewMode] = useState(() => !prefill?.clientId && prefill?.newName !== undefined && prefill?.newName !== null);
  const [newName, setNewName] = useState(prefill?.newName ?? "");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newColor, setNewColor] = useState(0);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [serviceId, setServiceId] = useState(() => (prefill?.serviceId && services.some((s) => s.id === prefill.serviceId) ? prefill.serviceId : (services[0]?.id ?? "")));
  const [memberId, setMemberId] = useState<string | "any">(prefill?.memberId ?? "any");
  const [date, setDate] = useState(prefill?.date ?? selectedDate);
  const [startMin, setStartMin] = useState<number | null>(prefill?.startMin ?? null);
  const [priceOpen, setPriceOpen] = useState(false);
  // NUOVO: durata diversa dal listino solo per questo appuntamento (null = quella del servizio)
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [durOpen, setDurOpen] = useState(false);
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

  // Senza rete gli orari si ricavano dalla fotografia del giorno: solo quel giorno, senza chiedere al server.
  const offlineResult: SlotsResult | null = !online && service ? (date === offlineDay.date ? { closed: offlineDay.hours.closed, durationMin: durationMin ?? service.durationMin, slots: offlineSlots(offlineDay, durationMin ?? service.durationMin, memberId === "any" ? null : memberId, 0) } : { closed: false, durationMin: durationMin ?? service.durationMin, slots: [] }) : null;

  // Gli orari liberi si ricaricano quando cambia servizio, barbiere o giorno.
  useEffect(() => {
    if (!online || walkInMode || !serviceId) return;
    let cancelled = false;
    startSlots(async () => {
      const result = await listSlots({ serviceId, memberId: memberId === "any" ? null : memberId, date, durationMin });
      if (cancelled) return;
      setSlots(result);
      setStartMin((current) => (current !== null && result.slots.some((s) => s.startMin === current && s.free) ? current : null));
    });
    return () => {
      cancelled = true;
    };
  }, [online, walkInMode, serviceId, memberId, date, durationMin]);

  const matches = useMemo(() => pickClients(clients.map((c) => ({ ...c, lastVisit: c.lastVisit ?? null })), query, { suggested: SUGGESTED_CLIENTS, results: SEARCH_RESULTS }), [clients, query]);
  const twins = useMemo(() => homonyms(clients.map((c) => ({ ...c, lastVisit: c.lastVisit ?? null }))), [clients]);
  /** Riga sotto il nome: ultime cifre del telefono (se si possono vedere) e ultima visita. */
  const clientDetail = (c: Pick<ClientOption, "phone" | "lastVisit">) => {
    const tail = phoneTail(c.phone);
    return [tail ? flow.phoneTail(tail) : null, c.lastVisit ? flow.lastVisit(visitLabel(c.lastVisit, today)) : flow.neverCame].filter(Boolean).join(" · ");
  };
  // stesso nome di un cliente già salvato: prima di crearne un doppione si chiede «è lui?»
  const [dupDismissed, setDupDismissed] = useState<string | null>(null);
  const duplicateCandidate = newMode && !clientId ? sameName(clients.map((c) => ({ ...c, lastVisit: c.lastVisit ?? null })), newName) : null;
  const duplicate = duplicateCandidate && dupDismissed !== normName(newName) ? duplicateCandidate : null;

  const shown = online ? slots : offlineResult;
  /** Più barbieri: c'è il blocco «Con chi», e con «Chiunque» gli orari dicono chi è libero. */
  const multi = operators.length > 1;

  // prezzo: quello di listino, o quello fatto per questo cliente
  const listCents = service?.priceCents ?? 0;
  const finalCents = priceCents ?? listCents;
  const changed = service !== undefined && finalCents !== listCents;

  const hasClient = clientId !== null || (newMode && newName.trim().length > 0);
  const clientLabel = client?.name ?? (newMode && newName.trim() ? newName.trim() : flow.pickClient);
  const canSave = hasClient && Boolean(service) && (walkInMode ? online : startMin !== null) && !saving;

  const whenLabel = walkInMode ? flow.nowSummary(nowText) : startMin !== null ? `${shortDate(date)} · ${clock(startMin)}` : flow.pickWhen;
  const priceLabel = changed ? flow.instead(formatPrice(finalCents), formatPrice(listCents)) : formatPrice(finalCents);
  const subLabel = service ? `${service.name} · ${durationMin ?? service.durationMin} min · ${priceLabel} · con ${operatorName ?? flow.anyoneSummary}` : "";

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
      const extra = { ...(priceCents !== null ? { priceCents, priceNote: priceNote.trim() || null } : {}), ...(durationMin !== null ? { durationMin } : {}) };
      const who = clientId ? { clientId } : { newClient: { name: newName.trim(), phone: newPhone.trim() || null, email: newEmail.trim() || null, avatarColor: newColor } };
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

  // «Nuovo cliente» prende il posto dell'elenco: il cursore va subito nel nome; «Annulla» riporta all'elenco
  const newNameRef = useRef<HTMLInputElement>(null);
  const openedNew = useRef(newMode);
  useEffect(() => {
    if (newMode && !openedNew.current) newNameRef.current?.focus();
    openedNew.current = newMode;
  }, [newMode]);
  /** «Salva cliente»: lo mette in rubrica subito (con foto e colore) e lo sceglie per questo appuntamento. */
  const saveNewClient = () =>
    startSaveClient(async () => {
      setNewError(null);
      const name = newName.trim();
      if (!name) return setNewError(agendaCopy.errors.clientName);
      const result = await createClientRecord({ name, phone: newPhone, email: newEmail, avatarColor: newColor });
      if (!result.ok) return setNewError(result.error);
      let photoUrl: string | null = null;
      if (photo) {
        const form = new FormData();
        form.set("photo", new File([photo.blob], "foto.jpg", { type: "image/jpeg" }));
        const up = await setClientPhoto(result.id, form).catch(() => null);
        if (up && up.ok) photoUrl = photo.url;
      }
      setAdded((cur) => [{ id: result.id, name: result.name, phone: newPhone.trim() || null, avatarColor: newColor, photoUrl, lastVisit: null }, ...cur]);
      setClientId(result.id);
      setNewMode(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      if (!photoUrl) setPhoto(null);
      toast(flow.clientSaved, result.name);
    });

  const cancelNew = () => {
    setNewMode(false);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setPhoto(null);
  };
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

        <section className={styles.block} data-block="cosa" aria-labelledby="fl-cosa">
          <div className={styles.blockHead}>
            <span className={styles.num} aria-hidden="true">
              1
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
                  setDurationMin(null);
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
              {/* NUOVO: la durata, come il prezzo: si cambia solo per questo appuntamento */}
              <div className={cx(styles.price, durationMin !== null && durationMin !== service.durationMin && styles.priceChanged)}>
                <span className={styles.priceLabel}>{flow.duration}</span>
                <span className={styles.priceValue}>
                  <span className={styles.priceOld} hidden={durationMin === null || durationMin === service.durationMin}>
                    {service.durationMin} min
                  </span>
                  <strong>{durationMin ?? service.durationMin} min</strong>
                </span>
                <button type="button" className={styles.priceEdit} aria-label={flow.changeDuration} title={flow.changeDuration} aria-expanded={durOpen} aria-controls="fl-durata" onClick={() => setDurOpen(!durOpen)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                    <path d="m13.5 6.5 4 4" />
                  </svg>
                </button>
              </div>
              <div className={styles.priceEditor} id="fl-durata" hidden={!durOpen}>
                <div className={styles.quicks} role="group" aria-label={flow.durationQuick}>
                  {quickDurations(service.durationMin).map((q) => {
                    const on = (durationMin ?? service.durationMin) === q.minutes;
                    return (
                      <button key={q.key} type="button" className={cx(styles.quick, on && styles.quickOn)} aria-pressed={on} onClick={() => setDurationMin(q.minutes === service.durationMin ? null : q.minutes)}>
                        {q.label}
                      </button>
                    );
                  })}
                </div>
                <div className={styles.durStepper}>
                  <button type="button" className={styles.durStep} aria-label={flow.durationLess} onClick={() => setDurationMin((d) => { const n = clampDuration((d ?? service.durationMin) - DURATION_STEP); return n === service.durationMin ? null : n; })}>
                    −
                  </button>
                  <output className={styles.durValue} aria-live="polite">
                    {durationMin ?? service.durationMin} min
                  </output>
                  <button type="button" className={styles.durStep} aria-label={flow.durationMore} onClick={() => setDurationMin((d) => { const n = clampDuration((d ?? service.durationMin) + DURATION_STEP); return n === service.durationMin ? null : n; })}>
                    +
                  </button>
                </div>
                <p className={cx(dialogs.hint)}>{flow.durationHint}</p>
              </div>
            </>
          ) : null}
        </section>

        {multi ? (
          <section className={styles.block} data-block="conchi" aria-labelledby="fl-conchi">
            <div className={styles.blockHead}>
              <span className={styles.num} aria-hidden="true">
                2
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
                    <OperatorAvatar name={o.name} colorIndex={operatorColor(o, i)} className={styles.avBig} />
                  </span>
                  <span className={styles.personName}>{o.name}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.block} data-block="quando" aria-labelledby="fl-quando">
          <div className={styles.blockHead}>
            <span className={styles.num} aria-hidden="true">
              {multi ? 3 : 2}
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
              <WhenPicker
                today={today}
                date={date}
                onDate={setDate}
                closedDates={closedDates}
                startMin={startMin}
                onTime={pickTime}
                shown={shown}
                loading={online && loadingSlots}
                operators={operators}
                showWho={multi && memberId === "any"}
                hint={
                  !online && date !== offlineDay.date
                    ? offlineCopy.onlyDay(dayLabel(offlineDay.date, today, ""))
                    : online && loadingSlots && !shown
                      ? "…"
                      : shown?.closed
                        ? copy.closed
                        : shown && !shown.slots.some((x) => x.free)
                          ? copy.noSlots
                          : flow.slotsHint(operatorName ?? copy.anyone, shortDate(date))
                }
              />
            </>
          )}
        </section>

        <section ref={clientBlock} className={styles.block} data-block="cliente" aria-labelledby="fl-cliente">
          <div className={styles.blockHead}>
            <span className={styles.num} aria-hidden="true">
              {multi ? 4 : 3}
            </span>
            <h3 className={styles.blockTitle} id="fl-cliente">
              {flow.forWhom}
            </h3>
          </div>
          {client ? (
            <div className={styles.clientPicked}>
              <Avatar name={client.name} color={client.avatarColor} photoUrl={client.photoUrl} size="md" className={styles.clientAv} />
              <span className={styles.clientText}>
                <span className={styles.clientName}>{client.name}</span>
                <span className={styles.clientSub}>{clientDetail(client)}</span>
              </span>
              <button type="button" className={dialogs.linkButton} onClick={() => setClientId(null)}>
                {copy.change}
              </button>
            </div>
          ) : newMode ? (
          <div className={styles.newClient} role="group" aria-labelledby="fl-nuovo">
            <div className={styles.newClientHead}>
              <h4 className={styles.newClientTitle} id="fl-nuovo">
                {flow.newClient}
              </h4>
              <button type="button" className={styles.newClientCancel} onClick={cancelNew}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
                {flow.cancelNew}
              </button>
            </div>
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
            <Field ref={newNameRef} size="large" label={copy.name} maxLength={LIMITS.clientName} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Field size="large" label={`${copy.phone} · ${copy.phoneHint}`} type="tel" inputMode="tel" maxLength={LIMITS.phone} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            <Field size="large" label={`${copy.email} · ${copy.emailHint}`} type="email" inputMode="email" autoComplete="off" maxLength={LIMITS.email} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            {duplicate ? (
              <div className={styles.dupWarn} role="status">
                <p className={styles.dupText}>{flow.duplicate(duplicate.name, clientDetail(duplicate))}</p>
                <div className={styles.dupActions}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setClientId(duplicate.id);
                      setNewMode(false);
                      setNewName("");
                      setNewPhone("");
                      setNewEmail("");
                      setPhoto(null);
                    }}
                  >
                    {flow.useExisting}
                  </Button>
                  <button type="button" className={dialogs.linkButton} onClick={() => setDupDismissed(normName(newName))}>
                    {flow.keepNew}
                  </button>
                </div>
              </div>
            ) : null}
            {newError ? (
              <p className={styles.newClientError} role="alert">
                {newError}
              </p>
            ) : null}
            {online ? (
              <div className={styles.newClientActions}>
                <Button size="large" disabled={savingClient || !newName.trim()} onClick={saveNewClient}>
                  {savingClient ? flow.savingClient : flow.saveClient}
                </Button>
                <p className={dialogs.hint}>{flow.saveClientHint}</p>
              </div>
            ) : null}
          </div>
          ) : (
            <>
              <Field
                size="large"
                label={flow.searchClient}
                labelClassName={dialogs.srOnly}
                boxClassName={dialogs.searchBox}
                placeholder={flow.searchClientLong}
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
              <div className={styles.clientList} role="group" aria-label={flow.savedClients}>
                <button
                  type="button"
                  className={cx(styles.clientRow, styles.clientRowNew)}
                  onClick={() => {
                    setNewMode(true);
                    setNewName((n) => n || query.trim());
                  }}
                >
                  <span className={styles.newAv} aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                  <span className={styles.clientText}>
                    <span className={styles.clientName}>{flow.newClient}</span>
                  </span>
                </button>
                {matches.length > 0 ? (
                  <p className={styles.clientListTitle} aria-hidden="true">
                    {query.trim() ? flow.foundClients : flow.recentClients}
                  </p>
                ) : null}
                {matches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={styles.clientRow}
                    aria-pressed={false}
                    onClick={() => {
                      setClientId(c.id);
                      setNewMode(false);
                      setQuery("");
                    }}
                  >
                    <Avatar name={c.name} color={c.avatarColor} photoUrl={c.photoUrl} size="md" className={styles.clientAv} />
                    <span className={styles.clientText}>
                      <span className={styles.clientName}>
                        {c.name}
                        {twins.has(normName(c.name)) ? <span className={styles.twinBadge}>{flow.sameNameBadge}</span> : null}
                      </span>
                      <span className={styles.clientSub}>{clientDetail(c)}</span>
                    </span>
                  </button>
                ))}
              </div>
              {query.trim() && matches.length === 0 ? <p className={dialogs.hint}>{copy.noClients}</p> : null}
            </>
          )}
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
