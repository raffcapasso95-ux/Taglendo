"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, ButtonLink, Field, ResponsiveDialog, Segmented, useToast } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { agendaCopy } from "@/lib/copy/agenda";
import {
  cancelAppointment,
  getAppointment,
  setAppointmentPrice,
  setAppointmentStatus,
  type Detail,
} from "@/lib/agenda/actions";
import { formatPrice } from "@/lib/dates/format";
import { longDay } from "@/lib/dates/rome";
import { clock, firstName, type DayModel, type Operator } from "@/lib/rules/agenda";
import { reminderText, whatsappLink } from "@/lib/rules/whatsapp";
import { offlineCopy } from "@/lib/copy/offline";
import { useOnline } from "@/lib/offline/hooks";
import { useAgenda } from "./AgendaProvider";
import { dayLabel } from "./NewAppointment";
import { MoveAppointment } from "./MoveAppointment";
import { eurosText, parseEuros, quickPrices } from "@/lib/rules/price";
import styles from "./Dialogs.module.css";
import flow from "./Flow.module.css";

const copy = agendaCopy.detail;

type Props = {
  id: string;
  today: string;
  canEdit: boolean;
  salonName: string;
  multipleOperators: boolean;
  operators: Operator[];
  closedDates: string[];
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

/** Il dettaglio dalla fotografia del giorno, quando non c'è la rete. Telefono e nota ci sono solo se erano già nella pagina. */
function detailFromSnapshot(day: DayModel, id: string): Detail | null {
  for (const col of day.columns) {
    const a = col.appts.find((x) => x.id === id);
    if (a) {
      return {
        id: a.id, clientId: null, clientName: a.clientName, phone: a.phone, note: "", serviceId: null, serviceName: a.serviceName,
        priceCents: a.priceCents, listPriceCents: a.priceCents, priceNote: "", date: day.date, startMin: a.startMin, endMin: a.endMin, memberId: a.memberId, memberName: col.operator.name,
        status: a.status, source: a.source,
      };
    }
  }
  return null;
}

export function AppointmentDetail({ id, today, canEdit, salonName, multipleOperators, operators, closedDates, onClose, onChanged }: Props) {
  const online = useOnline();
  const router = useRouter();
  const toast = useToast();
  const { day, queueStatus } = useAgenda();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [mode, setMode] = useState<"view" | "move" | "cancel">("view");
  const [loading, startLoad] = useTransition();
  const [working, startWork] = useTransition();
  const [error, setError] = useState<{ message: string } | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceText, setPriceText] = useState("");
  const [priceNote, setPriceNote] = useState("");

  useEffect(() => {
    startLoad(async () => {
      let d: Detail | null;
      try {
        d = navigator.onLine ? await getAppointment(id) : detailFromSnapshot(day, id);
      } catch {
        d = detailFromSnapshot(day, id); // la rete è caduta proprio adesso
      }
      if (!d) setMissing(true);
      else {
        setDetail(d);
        setPriceText(eurosText(d.priceCents));
        setPriceNote(d.priceNote);
      }
    });
  }, [id, today, day]);

  const changeStatus = (status: StatusKey) => {
    if (!detail || status === detail.status) return;
    startWork(async () => {
      if (!navigator.onLine) {
        // Niente rete: si mette in coda e parte appena torna.
        queueStatus(detail.id, status, { client: detail.clientName, service: detail.serviceName });
        setDetail({ ...detail, status });
        return onChanged({ message: offlineCopy.queued, sub: offlineCopy.queuedSub });
      }
      const result = await setAppointmentStatus(detail.id, status);
      if (result.ok) {
        setDetail({ ...detail, status });
        onChanged({ message: STATUS_TOAST[status] });
      } else setError({ message: result.error });
    });
  };

  /** Salva il prezzo fatto: subito con una scorciatoia, o quando si esce dal campo. */
  const savePrice = (cents: number | null, note: string) => {
    if (!detail || cents === null || (cents === detail.priceCents && note.trim() === detail.priceNote)) return;
    startWork(async () => {
      const result = await setAppointmentPrice({ id: detail.id, priceCents: cents, note });
      if (result.ok) {
        setDetail({ ...detail, priceCents: result.priceCents, priceNote: result.priceNote });
        setPriceText(eurosText(result.priceCents));
        toast(agendaCopy.flow.priceSaved);
        router.refresh();
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
      <p className={styles.alertTitle}>{error.message}</p>
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
      <MoveAppointment
        detail={detail}
        operators={operators}
        closedDates={closedDates}
        today={today}
        onClose={onClose}
        onBack={() => setMode("view")}
        onMoved={(to) => onChanged({ message: agendaCopy.toasts.moved, sub: `${dayLabel(to.date, today, "")}, ${clock(to.startMin)}` }, to.date)}
      />
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
            <Button variant="secondary" size="large" onClick={() => setMode("move")} disabled={!detail.serviceId || !online}>
              {copy.move}
            </Button>
            <Button variant="danger" size="large" disabled={!online} onClick={() => { setError(null); setMode("cancel"); }}>
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
          {editable && online ? (
            <div className={flow.priceBox}>
              <div className={cx(flow.price, detail.priceCents !== detail.listPriceCents && flow.priceChanged)}>
                <span className={flow.priceLabel}>{agendaCopy.flow.price}</span>
                <span className={flow.priceValue}>
                  <span className={flow.priceOld} hidden={detail.priceCents === detail.listPriceCents}>
                    {formatPrice(detail.listPriceCents)}
                  </span>
                  <strong>{formatPrice(detail.priceCents)}</strong>
                </span>
                <button type="button" className={flow.priceEdit} aria-label={agendaCopy.flow.changePrice} title={agendaCopy.flow.changePrice} aria-expanded={priceOpen} aria-controls="det-prezzo" onClick={() => setPriceOpen(!priceOpen)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                    <path d="m13.5 6.5 4 4" />
                  </svg>
                </button>
              </div>
              <div className={flow.priceEditor} id="det-prezzo" hidden={!priceOpen}>
                <div className={flow.quicks} role="group" aria-label={agendaCopy.flow.quick}>
                  {quickPrices(detail.listPriceCents).map((q) => (
                    <button
                      key={q.key}
                      type="button"
                      className={cx(flow.quick, detail.priceCents === q.cents && flow.quickOn)}
                      aria-pressed={detail.priceCents === q.cents}
                      disabled={working}
                      onClick={() => {
                        setPriceText(eurosText(q.cents));
                        savePrice(q.cents, priceNote);
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                <div className={flow.priceFields}>
                  <Field size="large" label={agendaCopy.flow.priceField} inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} onBlur={() => savePrice(parseEuros(priceText), priceNote)} />
                  <Field size="large" label={agendaCopy.flow.noteField} maxLength={60} value={priceNote} placeholder={agendaCopy.flow.notePlaceholder} onChange={(e) => setPriceNote(e.target.value)} onBlur={() => savePrice(parseEuros(priceText), priceNote)} />
                </div>
                <p className={styles.hint}>{agendaCopy.flow.priceHint}</p>
              </div>
            </div>
          ) : null}
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
