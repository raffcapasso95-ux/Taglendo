"use client";

import { useState } from "react";
import { cx } from "@/components/ui/cx";
import {
  clock,
  firstName,
  GRID_PX_PER_MIN as PX,
  gridRange,
  plural,
  span,
  type AgendaAppt,
  type Column,
  type DayModel,
} from "@/lib/rules/agenda";
import { formatPrice } from "@/lib/dates/format";
import { useAgenda } from "./AgendaProvider";
import { OperatorAvatar } from "./OperatorAvatar";
import styles from "./Day.module.css";

type Props = { day: DayModel; weekdayName: string; multiple: boolean };

/** Giorno chiuso o senza appuntamenti: lo dice e suggerisce cosa fare. */
function Empty({ day, weekdayName }: { day: DayModel; weekdayName: string }) {
  const closed = day.closed;
  return (
    <div className={styles.empty}>
      <h2 className={styles.emptyTitle}>{closed ? `${weekdayName}: salone chiuso` : day.isToday ? "Nessun appuntamento oggi" : "Nessun appuntamento"}</h2>
      <p className={styles.emptyText}>
        {closed ? "Puoi cambiare giorni di apertura e chiusure da Listino e orari." : "Fissa il primo cliente o condividi il link per ricevere prenotazioni."}
      </p>
    </div>
  );
}

export function DayView({ day, weekdayName, multiple }: Props) {
  const [showPast, setShowPast] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const empty = day.columns.every((c) => c.appts.length === 0);
  const toMove = day.columns.reduce((n, c) => n + c.appts.filter((a) => a.status === "confermato").length, 0);

  return (
    <>
      {day.closed && !empty ? (
        <p className={styles.closedBanner} role="status">
          {weekdayName}: salone chiuso · {plural(toMove, "appuntamento da spostare", "appuntamenti da spostare")}
        </p>
      ) : null}
      <div className={styles.desktopOnly}>
        {empty ? (
          <Empty day={day} weekdayName={weekdayName} />
        ) : (
          <DeskGrid day={day} showPast={showPast} setShowPast={setShowPast} showCancelled={showCancelled} setShowCancelled={setShowCancelled} />
        )}
      </div>
      <div className={styles.phoneOnly}>
        {empty ? (
          <Empty day={day} weekdayName={weekdayName} />
        ) : (
          <PhoneList day={day} multiple={multiple} showPast={showPast} setShowPast={setShowPast} showCancelled={showCancelled} setShowCancelled={setShowCancelled} />
        )}
      </div>
    </>
  );
}

type ViewProps = {
  day: DayModel;
  showPast: boolean;
  setShowPast: (v: boolean) => void;
  showCancelled: boolean;
  setShowCancelled: (v: boolean) => void;
};

const blockClass = (a: AgendaAppt, current: boolean) =>
  a.status === "annullato" ? styles.blockCanceled : a.status === "completato" ? styles.blockDone : a.status === "non_presentato" ? styles.blockNoShow : current ? styles.blockNow : styles.block;

/* ───────────── Desktop: griglia con una colonna per barbiere ───────────── */

function DeskGrid({ day, showPast, setShowPast, showCancelled, setShowCancelled }: ViewProps) {
  const { canEdit, openNew, openAppointment } = useAgenda();
  const { hours, isToday, nowMin } = day;
  const { open: dayOpen, start: g0, end } = gridRange(day, showPast);
  const height = (end - g0) * PX;
  const hourMarks: number[] = [];
  for (let h = Math.ceil(g0 / 60); h * 60 < end; h++) hourMarks.push(h * 60);
  const lineOffset = ((60 - (g0 % 60)) % 60) * PX;
  const nowTop = isToday && nowMin > g0 && nowMin < end ? (nowMin - g0) * PX : null;
  const hasBreak = !hours.closed && hours.breakStartMin != null && hours.breakEndMin != null && hours.breakEndMin > g0;
  const breakTop = hasBreak ? (Math.max(hours.breakStartMin!, g0) - g0) * PX : 0;
  const breakH = hasBreak ? (hours.breakEndMin! - Math.max(hours.breakStartMin!, g0)) * PX : 0;

  const hiddenCount = day.columns.reduce((n, c) => n + c.appts.filter((a) => a.status !== "annullato" && a.startMin < g0).length, 0);
  const canCollapse = isToday && (g0 > dayOpen || showPast);
  const cancelled = day.cancelledCount;

  return (
    <div className={styles.gridWrap}>
      <div className={styles.grid} style={{ minWidth: `calc(var(--grid-time-col) + ${day.columns.length} * var(--grid-col-min))` }}>
        <div className={styles.gridHead}>
          <div className={styles.cols} style={{ gridTemplateColumns: `var(--grid-time-col) repeat(${day.columns.length}, minmax(0, 1fr))` }}>
            <span className={styles.corner} />
            {day.columns.map((c) => (
              <ColumnHead key={c.operator.id} column={c} />
            ))}
          </div>
          {canCollapse ? (
            <button type="button" className={styles.pastBar} aria-expanded={showPast} onClick={() => setShowPast(!showPast)}>
              <span>
                {showPast
                  ? "Ore passate visibili"
                  : `Nascoste ${clock(dayOpen)}–${clock(g0)}${hiddenCount ? ` · ${plural(hiddenCount, "appuntamento", "appuntamenti")}` : ""}`}
              </span>
              <span className={styles.pastToggle}>{showPast ? "Nascondi" : "Mostra"}</span>
            </button>
          ) : null}
        </div>

        <div className={styles.cols} style={{ gridTemplateColumns: `var(--grid-time-col) repeat(${day.columns.length}, minmax(0, 1fr))` }}>
          <div className={styles.timeCol} style={{ height }}>
            {hourMarks.map((m) => (
              <span key={m} className={styles.hourLabel} style={{ top: (m - g0) * PX }}>
                {clock(m)}
              </span>
            ))}
            {nowTop !== null ? (
              <span className={styles.nowPill} style={{ top: nowTop }}>
                {clock(nowMin)}
              </span>
            ) : null}
          </div>
          {day.columns.map((c) => (
            <div key={c.operator.id} className={styles.col} style={{ height, backgroundPosition: `0 ${lineOffset}px, 0 ${lineOffset}px` }}>
              {nowTop !== null ? <div className={styles.veil} style={{ height: nowTop }} /> : null}
              {hasBreak ? (
                <div className={styles.pause} style={{ top: breakTop, height: breakH }}>
                  Pausa
                </div>
              ) : null}
              {c.gaps
                .filter(([, b]) => b > g0)
                .map(([a, b]) => {
                  const from = Math.max(a, g0);
                  return (
                    <button
                      key={`${a}-${b}`}
                      type="button"
                      className={styles.gap}
                      style={{ top: (from - g0) * PX, height: (b - from) * PX }}
                      disabled={!canEdit}
                      aria-label={`Fissa con ${c.operator.name} ${clock(from)}–${clock(b)}`}
                      onClick={() => openNew({ date: day.date, memberId: c.operator.id, startMin: Math.max(from, isToday ? Math.ceil(nowMin / 5) * 5 : 0) })}
                    >
                      <span className={styles.gapLine}>
                        <span className={styles.gapAction}>+ Fissa</span>
                        <span className={styles.gapLabel}>{span(b - from)} libere</span>
                      </span>
                      {(b - from) * PX >= 52 ? (
                        <span className={styles.gapRange}>
                          {clock(from)}–{clock(b)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              {c.appts
                .filter((a) => a.endMin > g0 && (a.status !== "annullato" || showCancelled))
                .map((a) => {
                  const current = isToday && a.status === "confermato" && a.startMin <= nowMin && nowMin < a.endMin;
                  const top = (Math.max(a.startMin, g0) - g0) * PX;
                  const h = (a.endMin - Math.max(a.startMin, g0)) * PX;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={cx(blockClass(a, current), a.status === "annullato" && styles.struck)}
                      style={{ top, height: h }}
                      title={`${clock(a.startMin)}–${clock(a.endMin)} · ${a.clientName} · ${a.serviceName}`}
                      onClick={() => openAppointment(a.id)}
                    >
                      <span className={styles.blockLine}>
                        <span className={styles.blockTime}>{clock(a.startMin)}</span>
                        <span className={styles.blockName}>{a.clientName}</span>
                      </span>
                      {h >= 44 ? <span className={styles.blockSvc}>{a.serviceName}</span> : null}
                    </button>
                  );
                })}
              {nowTop !== null ? <div className={styles.nowLine} style={{ top: nowTop }} /> : null}
            </div>
          ))}
        </div>
      </div>
      {cancelled > 0 ? (
        <button type="button" className={styles.cancelledToggle} onClick={() => setShowCancelled(!showCancelled)}>
          {plural(cancelled, "annullato", "annullati")} · {showCancelled ? "nascondi" : "mostra"}
        </button>
      ) : null}
    </div>
  );
}

function ColumnHead({ column: c }: { column: Column }) {
  return (
    <div className={styles.colHead}>
      <span className={styles.colTop}>
        <OperatorAvatar name={c.operator.name} colorIndex={c.colorIndex} size="sm" />
        <span className={styles.colName}>{c.operator.name}</span>
        <span className={styles.colCount}>{plural(c.count, "cliente", "clienti")}</span>
      </span>
      <span className={styles.colStatus}>
        <span className={c.status.kind === "busy" ? styles.dotBusy : styles.dotFree} aria-hidden="true" />
        <span className={styles.colStatusText}>{c.status.text}</span>
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${c.fill}%` }} />
      </span>
    </div>
  );
}

/* ───────────── Telefono: lista compatta in ordine di orario ───────────── */

type Item =
  | { kind: "appt"; start: number; appt: AgendaAppt; column: Column }
  | { kind: "gap"; start: number; end: number; column: Column }
  | { kind: "pause"; start: number; end: number }
  | { kind: "now"; start: number };

function PhoneList({ day, multiple, showPast, setShowPast, showCancelled, setShowCancelled }: ViewProps & { multiple: boolean }) {
  const { canEdit, openNew, openAppointment } = useAgenda();
  const { hours, isToday, nowMin } = day;
  const items: Item[] = [];
  for (const column of day.columns) {
    for (const appt of column.appts) {
      if (appt.status === "annullato" && !showCancelled) continue;
      const past = isToday && appt.endMin <= nowMin && appt.status !== "annullato";
      if (past && !showPast) continue;
      items.push({ kind: "appt", start: appt.startMin, appt, column });
    }
    for (const [a, b] of column.gaps) items.push({ kind: "gap", start: Math.max(a, isToday ? nowMin : 0), end: b, column });
  }
  if (hours.breakStartMin != null && hours.breakEndMin != null && !(isToday && hours.breakEndMin <= nowMin)) {
    items.push({ kind: "pause", start: hours.breakStartMin, end: hours.breakEndMin });
  }
  if (isToday && nowMin > hours.openMin && nowMin < hours.closeMin) items.push({ kind: "now", start: nowMin });
  const order = { now: 0, appt: 1, gap: 2, pause: 3 } as const;
  items.sort((x, y) => x.start - y.start || order[x.kind] - order[y.kind]);

  const pastCount = isToday ? day.columns.reduce((n, c) => n + c.appts.filter((a) => a.status !== "annullato" && a.endMin <= nowMin).length, 0) : 0;
  const cancelled = day.cancelledCount;

  return (
    <div className={styles.list}>
      {pastCount > 0 ? (
        <button type="button" className={styles.pastRow} aria-expanded={showPast} onClick={() => setShowPast(!showPast)}>
          <span>Già passati · {pastCount}</span>
          <span className={styles.pastRowToggle}>{showPast ? "Nascondi" : "Mostra"}</span>
        </button>
      ) : null}
      <ol className={styles.rows}>
        {items.map((item, i) => {
          if (item.kind === "now") {
            return (
              <li key="now" className={styles.nowRow}>
                <span className={styles.nowText}>Adesso · {clock(nowMin)}</span>
                <span className={styles.nowRule} />
              </li>
            );
          }
          if (item.kind === "pause") {
            return (
              <li key="pause" className={styles.pauseRow}>
                Pausa {clock(item.start)}–{clock(item.end)}
              </li>
            );
          }
          if (item.kind === "gap") {
            return (
              <li key={`g-${item.column.operator.id}-${item.start}`} className={styles.gapRow}>
                <button
                  type="button"
                  className={styles.rowButton}
                  disabled={!canEdit}
                  aria-label={`Fissa con ${item.column.operator.name} ${clock(item.start)}–${clock(item.end)}`}
                  onClick={() => openNew({ date: day.date, memberId: item.column.operator.id, startMin: Math.max(item.start, isToday ? Math.ceil(nowMin / 5) * 5 : 0) })}
                >
                  <span className={styles.rowTime}>{clock(item.start)}</span>
                  <span className={styles.gapRowText}>
                    Libero {span(item.end - item.start)}
                    {multiple ? ` · ${item.column.operator.name}` : ""}
                    <span className={styles.gapRowRange}>
                      {clock(item.start)}–{clock(item.end)}
                    </span>
                  </span>
                </button>
              </li>
            );
          }
          const { appt: a, column } = item;
          const current = isToday && a.status === "confermato" && a.startMin <= nowMin && nowMin < a.endMin;
          return (
            <li key={`${a.id}-${i}`} className={cx(styles.apptRow, current && styles.apptRowNow, a.status === "annullato" && styles.apptRowCanceled)}>
              <button type="button" className={styles.rowButton} onClick={() => openAppointment(a.id)}>
              <span className={styles.rowTime}>
                {clock(a.startMin)}
                <span className={styles.rowEnd}>{clock(a.endMin)}</span>
              </span>
              <span className={styles.apptMain}>
                <span className={cx(styles.apptName, a.status === "annullato" && styles.struck)}>{a.clientName}</span>
                <span className={styles.apptMeta}>
                  {current
                    ? `In poltrona · mancano ${span(a.endMin - nowMin)}`
                    : `${a.serviceName} · ${a.endMin - a.startMin} min · ${formatPrice(a.priceCents)}`}
                  {a.status === "completato" ? " · Completato" : a.status === "non_presentato" ? " · Non presentato" : a.status === "annullato" ? " · Annullato" : ""}
                </span>
              </span>
              {multiple ? (
                <span className={styles.opChip}>
                  <OperatorAvatar name={column.operator.name} colorIndex={column.colorIndex} size="sm" />
                  {firstName(column.operator.name)}
                </span>
              ) : null}
              </button>
            </li>
          );
        })}
      </ol>
      {cancelled > 0 ? (
        <button type="button" className={styles.cancelledToggle} onClick={() => setShowCancelled(!showCancelled)}>
          {plural(cancelled, "annullato", "annullati")} · {showCancelled ? "nascondi" : "mostra"}
        </button>
      ) : null}
    </div>
  );
}


