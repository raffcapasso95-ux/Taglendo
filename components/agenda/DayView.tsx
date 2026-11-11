"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import {
  clock,
  firstName,
  fitGridScale,
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
/** Giornata senza appuntamenti: riempie lo spazio dell'agenda e propone cosa fare (fissare, condividere il link). */
function Empty({ day, weekdayName }: { day: DayModel; weekdayName: string }) {
  const { canEdit, openNew } = useAgenda();
  const closed = day.closed;
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon} aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
          {closed ? <path d="M9.5 13.5l5 4M14.5 13.5l-5 4" /> : <path d="M12 13v4M10 15h4" />}
        </svg>
      </span>
      <h2 className={styles.emptyTitle}>{closed ? `${weekdayName}: salone chiuso` : day.isToday ? "Nessun appuntamento oggi" : "Nessun appuntamento"}</h2>
      <p className={styles.emptyText}>
        {closed ? "Puoi cambiare giorni di apertura e chiusure da Listino e orari." : "Fissa il primo cliente o condividi il link per ricevere prenotazioni."}
      </p>
      {closed ? (
        <div className={styles.emptyActions}>
          <ButtonLink href="/listino/orari" variant="secondary">
            Apri gli orari
          </ButtonLink>
        </div>
      ) : (
        <div className={styles.emptyActions}>
          {canEdit ? <Button onClick={() => openNew({ date: day.date })}>+ Fissa un appuntamento</Button> : null}
          <ButtonLink href="/salone" variant="secondary">
            Condividi il link
          </ButtonLink>
        </div>
      )}
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
      <div className={styles.desktopOnly} data-tour="day">
        {empty ? (
          <Empty day={day} weekdayName={weekdayName} />
        ) : (
          <DeskGrid day={day} showPast={showPast} setShowPast={setShowPast} showCancelled={showCancelled} setShowCancelled={setShowCancelled} />
        )}
      </div>
      <div className={styles.phoneOnly} data-tour="day">
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

/** NUOVO: etichetta ben visibile per gli appuntamenti chiusi (completato, non presentato, annullato). */
const STATE: Partial<Record<AgendaAppt["status"], { label: string; icon: string }>> = {
  completato: { label: "Completato", icon: "M5 12.5l4.5 4.5L19 7.5" },
  non_presentato: { label: "Non presentato", icon: "M12 7v6M12 17h.01" },
  annullato: { label: "Annullato", icon: "M7 7l10 10M17 7 7 17" },
};

function StateTag({ status }: { status: AgendaAppt["status"] }) {
  const s = STATE[status];
  if (!s) return null;
  return (
    <span className={cx(styles.stateTag, styles[`state_${status}` as "state_completato"])}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={s.icon} />
      </svg>
      {s.label}
    </span>
  );
}

const blockClass = (a: AgendaAppt, current: boolean) =>
  a.status === "annullato" ? styles.blockCanceled : a.status === "completato" ? styles.blockDone : a.status === "non_presentato" ? styles.blockNoShow : current ? styles.blockNow : styles.block;

/* ───────────── Desktop: griglia con una colonna per barbiere ───────────── */

function DeskGrid({ day, showPast, setShowPast, showCancelled, setShowCancelled }: ViewProps) {
  const { canEdit, openNew, openAppointment } = useAgenda();
  const { hours, isToday, nowMin } = day;
  const { open: dayOpen, start: g0, end } = gridRange(day, showPast);
  // scala uguale per tutte le colonne: i tratti in cui nessuno ha appuntamenti si comprimono
  const busy = day.columns.flatMap((c) => c.appts.filter((a) => a.status !== "annullato" || showCancelled).map((a): [number, number] => [a.startMin, a.endMin]));
  const pauseBand: Array<[number, number]> = hours.closed ? [] : hours.breaks;
  // la scala più comoda che fa stare la giornata nello spazio dell'agenda (misurato dopo il primo disegno)
  const gridRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setAvailable(Math.max(0, el.clientHeight - (headRef.current?.offsetHeight ?? 0)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = fitGridScale(busy, g0, end, available, pauseBand);
  const y = scale.y;
  const height = scale.height;
  // etichette delle ore: una ogni almeno 22 px, per non sovrapporle nei tratti compressi
  const hourMarks: Array<{ min: number; top: number; label: boolean }> = [];
  let lastLabel = -Infinity;
  for (let h = Math.ceil(g0 / 60); h * 60 < end; h++) {
    const top = y(h * 60);
    const label = top - lastLabel >= 22;
    if (label) lastLabel = top;
    hourMarks.push({ min: h * 60, top, label });
  }
  const nowTop = isToday && nowMin > g0 && nowMin < end ? y(nowMin) : null;
  // ogni pausa fra due fasce è una banda; quelle già finite prima dell'inizio della griglia non si disegnano
  const breakBands = (hours.closed ? [] : hours.breaks)
    .filter(([, to]) => to > g0)
    .map(([from, to]) => {
      const top = y(Math.max(from, g0));
      return { key: from, top, height: y(to) - top };
    });

  // oggi, se la griglia è più alta dello spazio, si parte dall'ora attuale
  useEffect(() => {
    const el = gridRef.current;
    if (!el || nowTop === null || el.scrollHeight <= el.clientHeight) return;
    el.scrollTop = Math.max(0, nowTop - el.clientHeight / 3);
    // solo al primo disegno del giorno
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.date]);

  const hiddenCount = day.columns.reduce((n, c) => n + c.appts.filter((a) => a.status !== "annullato" && a.startMin < g0).length, 0);
  const canCollapse = isToday && (g0 > dayOpen || showPast);
  const cancelled = day.cancelledCount;

  return (
    <div className={styles.gridWrap}>
      <div ref={gridRef} data-testid="agenda-grid" className={styles.grid} style={{ minWidth: `calc(var(--grid-time-col) + ${day.columns.length} * var(--grid-col-min))` }}>
        <div ref={headRef} className={styles.gridHead}>
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
            {/* l'etichetta dell'ora vicina a quella attuale si toglie: finirebbe sotto il segnaposto rosso */}
            {hourMarks.filter((m) => m.label && (nowTop === null || Math.abs(m.top - nowTop) >= 18)).map((m) => (
              <span key={m.min} className={styles.hourLabel} style={{ top: m.top }}>
                {clock(m.min)}
              </span>
            ))}
            {nowTop !== null ? (
              <span className={styles.nowPill} style={{ top: nowTop }}>
                {clock(nowMin)}
              </span>
            ) : null}
          </div>
          {day.columns.map((c) => (
            <div key={c.operator.id} className={styles.col} style={{ height }}>
              {hourMarks.map((m) => (
                <div key={m.min} className={styles.hourLine} style={{ top: m.top }} />
              ))}
              {nowTop !== null ? <div className={styles.veil} style={{ height: nowTop }} /> : null}
              {breakBands.map((band) => (
                <div key={band.key} className={styles.pause} style={{ top: band.top, height: band.height }}>
                  Pausa
                </div>
              ))}
              {c.gaps
                .filter(([, b]) => b > g0)
                .map(([a, b]) => {
                  const from = Math.max(a, g0);
                  const gapTop = y(from);
                  const gapH = y(b) - gapTop;
                  return (
                    <button
                      key={`${a}-${b}`}
                      type="button"
                      className={styles.gap}
                      style={{ top: gapTop, height: gapH }}
                      disabled={!canEdit}
                      onClick={() => openNew({ date: day.date, memberId: c.operator.id, startMin: Math.max(from, isToday ? Math.ceil(nowMin / 5) * 5 : 0) })}
                    >
                      <span className={styles.gapLine}>
                        <span className={styles.gapAction}>+ Fissa</span>
                        <span className={styles.gapLabel}>{span(b - from)} libere</span>
                        {gapH < 52 ? (
                          <span className={styles.gapRangeInline}>
                            {clock(from)}–{clock(b)}
                          </span>
                        ) : null}
                      </span>
                      {gapH >= 52 ? (
                        <span className={styles.gapRange}>
                          {clock(from)}–{clock(b)}
                        </span>
                      ) : null}
                      <span className="visually-hidden">, fissa con {c.operator.name}</span>
                    </button>
                  );
                })}
              {c.appts
                .filter((a) => a.endMin > g0 && (a.status !== "annullato" || showCancelled))
                .map((a) => {
                  const current = isToday && a.status === "confermato" && a.startMin <= nowMin && nowMin < a.endMin;
                  const top = y(Math.max(a.startMin, g0));
                  const h = y(a.endMin) - top;
                  const tall = h >= 46; // due righe: nome, poi orario e servizio
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={cx(blockClass(a, current), tall && styles.blockTall)}
                      style={{ top, height: h }}
                      title={`${clock(a.startMin)}–${clock(a.endMin)} · ${a.clientName} · ${a.serviceName}`}
                      onClick={() => openAppointment(a.id)}
                    >
                      {/* come in un calendario: il nome in alto, sotto orario e servizio; i blocchi bassi restano su una riga */}
                      <span className={styles.blockLine}>
                        <span className={tall ? "visually-hidden" : styles.blockTime}>{clock(a.startMin)} </span>
                        <span className={cx(styles.blockName, a.status === "annullato" && styles.struck)}>{a.clientName}</span>
                        <StateTag status={a.status} />
                      </span>
                      {tall ? (
                        <span className={styles.blockSvc}>
                          {clock(a.startMin)}–{clock(a.endMin)} · {a.serviceName}
                        </span>
                      ) : null}
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
  for (const [from, to] of hours.breaks) {
    if (!(isToday && to <= nowMin)) items.push({ kind: "pause", start: from, end: to });
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
              <li key={`pause-${item.start}`} className={styles.pauseRow}>
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
                  <span className="visually-hidden">, fissa con {item.column.operator.name}</span>
                </button>
              </li>
            );
          }
          const { appt: a, column } = item;
          const current = isToday && a.status === "confermato" && a.startMin <= nowMin && nowMin < a.endMin;
          return (
            <li key={`${a.id}-${i}`} className={cx(styles.apptRow, current && styles.apptRowNow, a.status === "annullato" && styles.apptRowCanceled, a.status === "completato" && styles.apptRowDone, a.status === "non_presentato" && styles.apptRowNoShow)}>
              <button type="button" className={styles.rowButton} onClick={() => openAppointment(a.id)}>
              <span className={styles.rowTime}>
                {clock(a.startMin)}
                <span className={styles.rowEnd}>{clock(a.endMin)}</span>
              </span>
              <span className={styles.apptMain}>
                <span className={cx(styles.apptName, a.status === "annullato" && styles.struck)}>{a.clientName}</span>
                <span className={cx(styles.apptMeta, STATE[a.status] && styles.apptMetaTagged)}>
                  <StateTag status={a.status} />
                  <span className={styles.apptMetaText}>
                    {current ? `In poltrona · mancano ${span(a.endMin - nowMin)}` : `${a.serviceName} · ${a.endMin - a.startMin} min · ${formatPrice(a.priceCents)}`}
                  </span>
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


