"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button, useIsDesktop } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { useDialog } from "@/components/ui/useDialog";
import { agendaCopy } from "@/lib/copy/agenda";
import { listSlots, moveAppointment, type Alternative, type Conflict, type Detail, type SlotsResult } from "@/lib/agenda/actions";
import { formatPrice } from "@/lib/dates/format";
import { clock, operatorColor, type Operator } from "@/lib/rules/agenda";
import { OperatorAvatar } from "./OperatorAvatar";
import { dayLabel, shortDate } from "./NewAppointment";
import { WhenPicker } from "./WhenPicker";
import dialogs from "./Dialogs.module.css";
import styles from "./Flow.module.css";

const copy = agendaCopy.form;
const flow = agendaCopy.flow;
const detailCopy = agendaCopy.detail;

type Props = {
  detail: Detail;
  operators: Operator[];
  closedDates: string[];
  today: string;
  /** Chiusura voluta (X, Esc, clic fuori): si torna all'agenda. */
  onClose: () => void;
  /** «Annulla»: si torna ai dettagli dell'appuntamento. */
  onBack: () => void;
  onMoved: (to: { date: string; startMin: number }) => void;
};

/**
 * «Sposta appuntamento», come «Nuovo appuntamento»: una schermata con i blocchi Quando e Con chi sempre aperti
 * e il riepilogo con «Sposta» in fondo. Cosa e Per chi non cambiano: il servizio e il cliente restano quelli.
 */
export function MoveAppointment({ detail, operators, closedDates, today, onClose, onBack, onMoved }: Props) {
  const desktop = useIsDesktop();
  const [memberId, setMemberId] = useState<string | "any">(detail.memberId);
  const [date, setDate] = useState(detail.date >= today ? detail.date : today);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotsResult | null>(null);
  const [loadingSlots, startSlots] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<{ message: string; conflict?: Conflict } | null>(null);
  const leaveByBack = useRef(false);

  const dismiss = () => {
    leaveByBack.current = true;
    onClose();
  };
  const back = () => {
    leaveByBack.current = true;
    onBack();
  };
  const { ref } = useDialog(true, dismiss, 0);

  // su telefono la schermata è una «pagina»: il tasto indietro la chiude
  useEffect(() => {
    if (desktop) return;
    history.pushState({ tgFlow: true }, "");
    const onPop = () => {
      leaveByBack.current = false;
      onBack();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (leaveByBack.current && (history.state as { tgFlow?: boolean } | null)?.tgFlow) history.back();
    };
    // solo all'apertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop]);

  // gli orari liberi si ricaricano quando cambia barbiere o giorno (l'appuntamento stesso non conta come occupato)
  useEffect(() => {
    if (!detail.serviceId) return;
    let cancelled = false;
    startSlots(async () => {
      // la durata è quella dell'appuntamento (anche se diversa dal listino)
      const result = await listSlots({ serviceId: detail.serviceId!, memberId: memberId === "any" ? null : memberId, date, excludeId: detail.id, durationMin: detail.endMin - detail.startMin });
      if (cancelled) return;
      setSlots(result);
      setStartMin((c) => (c !== null && result.slots.some((s) => s.startMin === c && s.free) ? c : null));
    });
    return () => {
      cancelled = true;
    };
  }, [detail.id, detail.serviceId, memberId, date]);

  const operatorName = memberId === "any" ? null : operators.find((o) => o.id === memberId)?.name;
  const noSlots = slots !== null && slots.slots.every((s) => !s.free);
  const whenLabel = startMin !== null ? `${shortDate(date)} · ${clock(startMin)}` : flow.pickWhen;
  const subLabel = [
    detail.serviceName,
    slots ? `${slots.durationMin} min` : null,
    formatPrice(detail.priceCents),
    `con ${operatorName ?? flow.anyoneSummary}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const hint = loadingSlots && !slots ? "…" : slots?.closed ? copy.closed : noSlots ? copy.noSlots : flow.slotsHint(operatorName ?? copy.anyone, shortDate(date));

  const save = () =>
    startSave(async () => {
      setError(null);
      const result = await moveAppointment({ id: detail.id, date, startMin: startMin ?? 0, memberId: memberId === "any" ? null : memberId });
      if (!result.ok) return setError({ message: result.error, conflict: result.conflict });
      // spostato: la voce messa nella cronologia resta com'è, senza tornare indietro
      leaveByBack.current = false;
      onMoved({ date: result.date, startMin: result.startMin });
    });

  const pickAlternative = (alt: Alternative) => {
    setDate(alt.date);
    setStartMin(alt.startMin);
    if (memberId !== "any") setMemberId(alt.memberId);
    setError(null);
  };

  return (
    <dialog ref={ref} className={styles.flow} aria-labelledby="move-title" data-dialog="sposta">
      <header className={styles.bar}>
        <button type="button" className={styles.barCancel} onClick={back}>
          {agendaCopy.form.cancel}
        </button>
        <h2 id="move-title" className={styles.title}>
          {detailCopy.moveTitle}
        </h2>
        <button type="button" className={styles.barClose} onClick={back} aria-label={flow.close}>
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

        {operators.length > 1 ? (
          <section className={styles.block} data-block="conchi" aria-labelledby="mv-conchi">
            <div className={styles.blockHead}>
              <span className={styles.num} aria-hidden="true">
                1
              </span>
              <h3 className={styles.blockTitle} id="mv-conchi">
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
        <section className={styles.block} data-block="quando" aria-labelledby="mv-quando">
          <div className={styles.blockHead}>
            <span className={styles.num} aria-hidden="true">
              {operators.length > 1 ? 2 : 1}
            </span>
            <h3 className={styles.blockTitle} id="mv-quando">
              {flow.when}
            </h3>
          </div>
          <p className={dialogs.hint}>{detailCopy.moveNow(`${shortDate(detail.date)} · ${clock(detail.startMin)} · ${detail.memberName}`)}</p>
          <WhenPicker today={today} date={date} onDate={setDate} closedDates={closedDates} startMin={startMin} onTime={setStartMin} shown={slots} loading={loadingSlots} hint={hint} operators={operators} showWho={operators.length > 1 && memberId === "any"} />
        </section>

      </div>

      <footer className={styles.footer}>
        <div className={styles.summary} aria-live="polite">
          <span className={styles.sumMain}>
            {whenLabel} · {detail.clientName}
          </span>
          <span className={styles.sumSub}>{subLabel}</span>
        </div>
        <Button size="large" className={styles.confirm} disabled={startMin === null || saving} onClick={save}>
          {saving ? detailCopy.moveSaving : detailCopy.move}
        </Button>
      </footer>
    </dialog>
  );
}
