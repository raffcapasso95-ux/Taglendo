"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, ButtonLink, ResponsiveDialog, Segmented } from "@/components/ui";
import { agendaCopy } from "@/lib/copy/agenda";
import {
  cancelAppointment,
  getAppointment,
  listSlots,
  moveAppointment,
  setAppointmentStatus,
  type Alternative,
  type Conflict,
  type Detail,
  type SlotsResult,
} from "@/lib/agenda/actions";
import { formatPrice } from "@/lib/dates/format";
import { longDay } from "@/lib/dates/rome";
import { clock, firstName } from "@/lib/rules/agenda";
import { reminderText, whatsappLink } from "@/lib/rules/whatsapp";
import { dayLabel } from "./NewAppointment";
import { DayPicker } from "./DayPicker";
import { TimeChips } from "./TimeChips";
import styles from "./Dialogs.module.css";

const copy = agendaCopy.detail;

type Props = {
  id: string;
  today: string;
  canEdit: boolean;
  salonName: string;
  multipleOperators: boolean;
  onClose: () => void;
  /** Dopo una modifica: il messaggio per l'avviso e, se serve, il giorno da aprire. */
  onChanged: (toast: { message: string; sub?: string }, date?: string) => void;
};

type StatusKey = "confermato" | "completato" | "non_presentato";
const STATUS_OPTIONS: Array<{ value: StatusKey; label: string }> = [
  { value: "confermato", label: copy.statuses.confermato },
  { value: "completato", label: copy.statuses.completato },
  { value: "non_presentato", label: copy.statuses.non_presentato },
];
const STATUS_TOAST: Record<StatusKey, string> = {
  confermato: agendaCopy.toasts.confirmed,
  completato: agendaCopy.toasts.done,
  non_presentato: agendaCopy.toasts.noShow,
};

export function AppointmentDetail({ id, today, canEdit, salonName, multipleOperators, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [mode, setMode] = useState<"view" | "move" | "cancel">("view");
  const [date, setDate] = useState(today);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotsResult | null>(null);
  const [loading, startLoad] = useTransition();
  const [loadingSlots, startSlots] = useTransition();
  const [working, startWork] = useTransition();
  const [error, setError] = useState<{ message: string; conflict?: Conflict } | null>(null);

  useEffect(() => {
    startLoad(async () => {
      const d = await getAppointment(id);
      if (!d) setMissing(true);
      else {
        setDetail(d);
        setDate(d.date >= today ? d.date : today);
      }
    });
  }, [id, today]);

  // Orari liberi per lo spostamento (l'appuntamento stesso non conta come occupato).
  useEffect(() => {
    if (mode !== "move" || !detail?.serviceId) return;
    let cancelled = false;
    startSlots(async () => {
      const result = await listSlots({ serviceId: detail.serviceId!, memberId: detail.memberId, date, excludeId: detail.id });
      if (cancelled) return;
      setSlots(result);
      setStartMin((c) => (c !== null && result.slots.some((s) => s.startMin === c && s.free) ? c : null));
    });
    return () => {
      cancelled = true;
    };
  }, [mode, detail, date]);

  const changeStatus = (status: StatusKey) => {
    if (!detail || status === detail.status) return;
    startWork(async () => {
      const result = await setAppointmentStatus(detail.id, status);
      if (result.ok) {
        setDetail({ ...detail, status });
        onChanged({ message: STATUS_TOAST[status] });
      } else setError({ message: result.error });
    });
  };

  const confirmCancel = () =>
    detail &&
    startWork(async () => {
      const result = await cancelAppointment(detail.id);
      if (result.ok) onChanged({ message: agendaCopy.toasts.cancelled, sub: agendaCopy.toasts.cancelledSub });
      else setError({ message: result.error });
    });

  const confirmMove = () =>
    detail &&
    startMin !== null &&
    startWork(async () => {
      setError(null);
      const result = await moveAppointment({ id: detail.id, date, startMin });
      if (result.ok) onChanged({ message: agendaCopy.toasts.moved, sub: `${dayLabel(date, today, "")}, ${clock(startMin)}` }, date);
      else setError({ message: result.error, conflict: result.conflict });
    });

  const pickAlternative = (a: Alternative) => {
    setDate(a.date);
    setStartMin(a.startMin);
    setError(null);
  };

  const editable = canEdit && detail !== null && detail.status !== "annullato";

  if (missing) {
    return (
      <ResponsiveDialog open onClose={onClose} title="Appuntamento" footer={<Button size="large" onClick={onClose}>{copy.close}</Button>}>
        <p>{agendaCopy.errors.gone}</p>
      </ResponsiveDialog>
    );
  }

  if (!detail) {
    return (
      <ResponsiveDialog open onClose={onClose} title="Appuntamento">
        <p className={styles.hint} aria-busy={loading}>…</p>
      </ResponsiveDialog>
    );
  }

  const first = firstName(detail.clientName);
  const wa = whatsappLink(
    detail.phone,
    reminderText({ clientName: detail.clientName, dayLabel: detail.date === today ? "di oggi" : `di ${longDay(detail.date)}`, time: clock(detail.startMin), salonName }),
  );

  const alert = error ? (
    <div className={styles.alert} role="alert">
      <p className={styles.alertTitle}>{error.conflict?.title ?? error.message}</p>
      {error.conflict ? <p>{error.conflict.text}</p> : null}
      {error.conflict && error.conflict.alternatives.length > 0 ? (
        <div className={styles.chips}>
          {error.conflict.alternatives.map((a) => (
            <button key={`${a.date}-${a.startMin}`} type="button" className={styles.chip} onClick={() => pickAlternative(a)}>
              {dayLabel(a.date, today, "")} · {clock(a.startMin)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  if (mode === "cancel") {
    return (
      <ResponsiveDialog
        open
        onClose={onClose}
        title={agendaCopy.detail.cancel}
        footer={
          <>
            <Button variant="secondary" size="large" onClick={() => setMode("view")}>
              {copy.keep}
            </Button>
            <Button variant="danger" size="large" disabled={working} onClick={confirmCancel}>
              {copy.cancelYes}
            </Button>
          </>
        }
      >
        {alert}
        <p>{copy.cancelAsk(first)}</p>
      </ResponsiveDialog>
    );
  }

  if (mode === "move") {
    return (
      <ResponsiveDialog
        open
        onClose={onClose}
        title={copy.moveTitle(detail.memberName)}
        footer={
          <>
            <Button variant="secondary" size="large" onClick={() => { setMode("view"); setError(null); }}>
              {copy.back}
            </Button>
            <Button size="large" disabled={startMin === null || working} onClick={confirmMove}>
              {copy.confirm}
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          {alert}
          <DayPicker value={date} today={today} onChange={setDate} />
          <TimeChips result={slots} loading={loadingSlots} selected={startMin} onSelect={setStartMin} label={agendaCopy.form.slotsWith(detail.memberName)} />
          <p className={styles.recap}>{startMin !== null ? copy.moveSummary(`${dayLabel(date, today, "")}, ${clock(startMin)}`) : copy.moveChoose}</p>
        </div>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={detail.clientName}
      footer={
        editable ? (
          <>
            <Button variant="secondary" size="large" onClick={() => setMode("move")} disabled={!detail.serviceId}>
              {copy.move}
            </Button>
            <Button variant="danger" size="large" onClick={() => { setError(null); setMode("cancel"); }}>
              {copy.cancel}
            </Button>
          </>
        ) : (
          <Button size="large" onClick={onClose}>
            {copy.close}
          </Button>
        )
      }
    >
      <div className={styles.form}>
        {alert}
        <div className={styles.head}>
          <span className={styles.badge} data-status={detail.status}>
            {copy.statuses[detail.status]}
          </span>
          <div className={styles.when}>
            <span className={styles.whenTime}>{clock(detail.startMin)}</span>
            <span className={styles.whenSub}>
              –{clock(detail.endMin)} · {detail.date === today ? "oggi" : longDay(detail.date)}
            </span>
          </div>
          <p className={styles.sub}>
            {detail.serviceName} · {formatPrice(detail.priceCents)}
            {multipleOperators ? ` · con ${detail.memberName}` : ""}
            {detail.source === "online" ? ` · ${copy.online}` : ""}
          </p>
        </div>

        {detail.note ? (
          <div className={styles.note}>
            <span className={styles.noteTitle}>{copy.note}</span>
            {detail.note}
          </div>
        ) : null}

        {detail.phone && wa ? (
          <div className={styles.contact}>
            <ButtonLink href={wa} target="_blank" rel="noopener noreferrer" variant="secondary" size="large">
              {copy.whatsapp}
            </ButtonLink>
            <ButtonLink href={`tel:${detail.phone.replace(/[^\d+]/g, "")}`} variant="secondary" size="large">
              {copy.call}
            </ButtonLink>
          </div>
        ) : (
          <p className={styles.hint}>{copy.noPhone}</p>
        )}

        {editable ? (
          <Segmented label="Stato" value={detail.status as StatusKey} onChange={changeStatus} options={STATUS_OPTIONS} fullWidth />
        ) : !canEdit ? (
          <p className={styles.hint}>{copy.readOnly}</p>
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
