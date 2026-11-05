"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { useToast } from "@/components/ui";
import { setAppointmentStatus } from "@/lib/agenda/actions";
import { agendaCopy } from "@/lib/copy/agenda";
import { offlineCopy } from "@/lib/copy/offline";
import { formatPrice } from "@/lib/dates/format";
import { clock, firstName, sideSummary, span, type DayModel, type SideAppt } from "@/lib/rules/agenda";
import { useAgenda } from "./AgendaProvider";
import { OperatorAvatar } from "./OperatorAvatar";
import agenda from "./Agenda.module.css";
import styles from "./SidePanel.module.css";

type Status = "completato" | "non_presentato";

/**
 * Colonna di destra su desktop. Non è solo da guardare: chiude gli appuntamenti finiti con un tocco,
 * apre quelli in arrivo e trasforma ogni posto libero in un nuovo appuntamento già compilato.
 */
export function SidePanel({ day, title }: { day: DayModel; title: string }) {
  const { canEdit, openNew, openAppointment, queueStatus } = useAgenda();
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const s = sideSummary(day);

  const close = (a: SideAppt, status: Status) =>
    start(async () => {
      if (!navigator.onLine) {
        queueStatus(a.id, status, { client: a.clientName, service: a.serviceName });
        return toast(offlineCopy.queued, offlineCopy.queuedSub);
      }
      const r = await setAppointmentStatus(a.id, status);
      toast(r.ok ? (status === "completato" ? agendaCopy.toasts.done : agendaCopy.toasts.noShow) : r.error);
      if (r.ok) router.refresh();
    });

  const nowTitle = day.isToday ? title : "Primi appuntamenti";
  const noWork = s.live.length === 0 && s.toClose.length === 0 && s.upcoming.length === 0;

  return (
    <aside className={agenda.side} aria-label="Adesso in salone">
      <section className={styles.section} aria-labelledby="side-now">
        <h2 id="side-now" className={styles.title}>
          {nowTitle}
        </h2>
        <ul className={styles.list}>
          {s.live.map((a) => (
            <Card key={a.id} onOpen={openAppointment} appt={a} tag={`In poltrona · finisce alle ${clock(a.endMin)}`} live>
              {canEdit ? <Actions appt={a} pending={pending} onClose={close} /> : null}
            </Card>
          ))}
          {s.toClose.map((a) => (
            <Card key={a.id} onOpen={openAppointment} appt={a} tag={`Finito alle ${clock(a.endMin)} · da chiudere`} live>
              {canEdit ? <Actions appt={a} pending={pending} onClose={close} /> : null}
            </Card>
          ))}
          {s.live.length === 0 && s.toClose.length === 0 && day.isToday ? <li className={styles.empty}>Nessuno in poltrona.</li> : null}
          {s.upcoming.map((a) => (
            <Card key={a.id} onOpen={openAppointment} appt={a} tag={`${clock(a.startMin)} · ${a.serviceName}`} />
          ))}
          {noWork ? <li className={styles.empty}>Nessun appuntamento in programma.</li> : null}
        </ul>
      </section>

      {day.freeNext.length > 0 ? (
        <section className={styles.free} aria-labelledby="side-free">
          <h2 id="side-free" className={styles.title}>
            {day.freeNext.length > 1 ? "Primi posti liberi" : "Primo posto libero"}
          </h2>
          {day.freeNext.map((f) => (
            <button
              key={`${f.memberId}-${f.start}`}
              type="button"
              className={styles.freeButton}
              disabled={!canEdit}
              onClick={() => openNew({ date: day.date, memberId: f.memberId, startMin: Math.max(f.start, day.isToday ? Math.ceil(day.nowMin / 5) * 5 : 0) })}
            >
              <OperatorAvatar name={f.name} colorIndex={f.colorIndex} size="sm" />
              <span className={styles.text}>
                <span className={styles.freeWhen}>{f.now ? "Libero adesso" : `Libero dalle ${clock(f.start)}`}</span>
                <span className={styles.freeSub}>
                  {firstName(f.name)} · {span(f.end - f.start)} · fino alle {clock(f.end)}
                </span>
              </span>
              {canEdit ? <span className={styles.plus}>+ Fissa</span> : null}
            </button>
          ))}
        </section>
      ) : null}

      {!day.closed ? (
        <section className={styles.section} aria-labelledby="side-numbers">
          <h2 id="side-numbers" className={styles.title}>
            {day.isToday ? "Oggi in numeri" : "Giornata in numeri"}
          </h2>
          <dl className={styles.numbers}>
            <div className={styles.number}>
              <dt>Clienti</dt>
              <dd>{s.clientCount}</dd>
            </div>
            <div className={styles.number}>
              <dt>Incasso</dt>
              <dd>{formatPrice(s.revenueCents)}</dd>
            </div>
            <div className={styles.number}>
              <dt>Occupato</dt>
              <dd>{s.fill}%</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </aside>
  );
}

function Card({ appt, tag, live = false, onOpen, children }: { appt: SideAppt; tag: string; live?: boolean; onOpen: (id: string) => void; children?: ReactNode }) {
  return (
    <li className={`${styles.item} ${live ? styles.live : ""}`}>
      <button type="button" className={styles.rowButton} onClick={() => onOpen(appt.id)}>
        <OperatorAvatar name={appt.operatorName} colorIndex={appt.colorIndex} size="sm" />
        <span className={styles.text}>
          <span className={styles.meta}>
            {firstName(appt.operatorName)} · {tag}
          </span>
          <span className={styles.name}>{appt.clientName}</span>
        </span>
      </button>
      {children}
    </li>
  );
}

function Actions({ appt, pending, onClose }: { appt: SideAppt; pending: boolean; onClose: (a: SideAppt, s: Status) => void }) {
  return (
    <div className={styles.actions}>
      <button type="button" disabled={pending} onClick={() => onClose(appt, "completato")}>
        Completato
      </button>
      <button type="button" disabled={pending} onClick={() => onClose(appt, "non_presentato")}>
        Non è venuto
      </button>
    </div>
  );
}
