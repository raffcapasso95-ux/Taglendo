"use client";

import { useState } from "react";
import { Button, ResponsiveDialog, Toggle } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import toggle from "@/components/ui/Toggle.module.css";
import dialog from "@/components/agenda/Dialogs.module.css";
import { listinoCopy } from "@/lib/copy/listino";
import { formatMinutes, MAX_RANGES, type Range, type WeekDay } from "@/lib/rules/hours";
import { addRange, copyDay, DAY_SHORT, dayTitle, removeRange, stepRange, STEP, WEEK_ORDER, type RangeField } from "@/lib/rules/listino";
import styles from "./Listino.module.css";

const copy = listinoCopy;
const hours = copy.hoursPage;

const rangeText = ([a, b]: Range) => `${formatMinutes(a)}–${formatMinutes(b)}`;

/** Apre o chiude un giorno: aprendo un giorno senza fasce si parte da mattina e pomeriggio. */
export function toggleWeekDay(week: WeekDay[], weekday: number): WeekDay[] {
  return week.map((d, i): WeekDay => {
    if (i !== weekday) return d;
    const off = d.closed || d.ranges.length === 0;
    return off ? { closed: false, ranges: d.ranges.length ? d.ranges : [[540, 780], [870, 1140]] } : { ...d, closed: true };
  });
}

type Props = {
  week: WeekDay[];
  canEdit: boolean;
  saving: boolean;
  /** Il giorno aperto/chiuso dall'interruttore, o le fasce salvate dal foglio di un giorno (done chiude il foglio). */
  onChange: (next: WeekDay[], done?: () => void) => void;
};

/**
 * La settimana con le fasce di ogni giorno: interruttore aperto/chiuso e foglio del giorno con le frecce.
 * La usano «Orari» nel listino e il primo avvio (stessi orari, stesse regole).
 */
export function WeekEditor({ week, canEdit, saving, onChange }: Props) {
  const [editing, setEditing] = useState<number | null>(null);
  const toggleDay = (w: number) => onChange(toggleWeekDay(week, w));
  return (
    <>
    <ul className={styles.week}>
          {WEEK_ORDER.map((w) => {
            const day = week[w]!;
            const off = day.closed || day.ranges.length === 0;
            return (
              <li key={w} className={cx(styles.dayRow, off && styles.dayRowClosed)}>
                <button type="button" className={styles.dayMain} disabled={!canEdit} onClick={() => setEditing(w)}>
                  <span className={styles.dayName}>{dayTitle(w)}</span>
                  <span className={styles.ranges}>
                    {off ? (
                      <span className={styles.rangeClosed}>{hours.closed}</span>
                    ) : (
                      day.ranges.map((r) => (
                        <span key={r[0]} className={styles.range}>
                          {rangeText(r)}
                        </span>
                      ))
                    )}
                  </span>
                  <span className="visually-hidden">, {hours.editHint}</span>
                  <span className={styles.chev} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </span>
                </button>
                <button type="button" role="switch" aria-checked={!off} className={cx(styles.daySwitch)} aria-label={hours.dayOpen(dayTitle(w))} disabled={!canEdit || saving} onClick={() => toggleDay(w)}>
                  <span className={cx(toggle.track, styles.Toggle_track)} aria-hidden="true">
                    <span className={cx(toggle.knob, styles.Toggle_knob)} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      {editing !== null ? <DayDialog key={editing} weekday={editing} week={week} saving={saving} onClose={() => setEditing(null)} onSave={(next) => onChange(next, () => setEditing(null))} /> : null}
    </>
  );
}

/** Il foglio di un giorno: aperto/chiuso, le fasce con le frecce e «Usa questi orari anche per». */
function DayDialog({ weekday, week, saving, onClose, onSave }: { weekday: number; week: WeekDay[]; saving: boolean; onClose: () => void; onSave: (week: WeekDay[]) => void }) {
  const day = week[weekday]!;
  const name = dayTitle(weekday);
  const [open, setOpen] = useState(!day.closed && day.ranges.length > 0);
  const [ranges, setRanges] = useState<Range[]>(day.ranges.length ? day.ranges : [[540, 780], [870, 1140]]);
  const [also, setAlso] = useState<number[]>([]);
  const t = copy.day;

  const submit = () => {
    const edited = week.map((d, i) => (i === weekday ? { closed: !open, ranges } : d));
    onSave(open && also.length ? copyDay(edited, weekday, also) : edited);
  };
  const step = (index: number, field: RangeField, delta: number) => setRanges((r) => stepRange(r, index, field, delta));

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={name}
      footer={
        <div className={dialog.footerButtons}>
          <Button variant="secondary" size="large" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button size="large" disabled={saving} onClick={submit}>
            {t.save}
          </Button>
        </div>
      }
    >
      <div className={dialog.form}>
        <Toggle className={styles.openToggle} label={t.open(name)} description={t.openOff} checked={open} onChange={setOpen} />
        <section className={dialog.section}>
          <h3 className={dialog.sectionTitle}>{t.slots}</h3>
          <ul className={styles.slots}>
            {ranges.map((r, i) => (
              <li key={i} className={styles.slot}>
                <span className={styles.slotNum}>{i + 1}</span>
                <div className={styles.slotTimes}>
                  {(["from", "to"] as const).map((field) => (
                    <span key={field} className={styles.slotField}>
                      <span className={styles.slotLabel}>{field === "from" ? t.from : t.to}</span>
                      <span className={styles.stepper}>
                        <button type="button" className={styles.stepButton} aria-label={t.slotLabel(i + 1, field === "from" ? t.from : t.to, t.before)} onClick={() => step(i, field, -STEP)}>
                          −
                        </button>
                        <output className={styles.stepValue}>{formatMinutes(field === "from" ? r[0] : r[1])}</output>
                        <button type="button" className={styles.stepButton} aria-label={t.slotLabel(i + 1, field === "from" ? t.from : t.to, t.after)} onClick={() => step(i, field, STEP)}>
                          +
                        </button>
                      </span>
                    </span>
                  ))}
                </div>
                {ranges.length > 1 ? (
                  <button type="button" className={styles.slotRemove} aria-label={t.remove(rangeText(r))} onClick={() => setRanges(removeRange(ranges, i))}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {ranges.length < MAX_RANGES && addRange(ranges) ? (
            <button type="button" className={styles.addSlot} onClick={() => setRanges(addRange(ranges) ?? ranges)}>
              {t.add}
            </button>
          ) : null}
          <p className={dialog.hint}>{t.pauseHint}</p>
        </section>
        <section className={dialog.section}>
          <h3 className={dialog.sectionTitle}>{t.copyTitle}</h3>
          <div className={styles.copyDays} role="group" aria-label={t.copyLabel}>
            {WEEK_ORDER.filter((w) => w !== weekday).map((w) => (
              <button key={w} type="button" className={styles.copyDay} aria-pressed={also.includes(w)} onClick={() => setAlso((cur) => (cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w]))}>
                {DAY_SHORT[w]}
              </button>
            ))}
          </div>
        </section>
      </div>
    </ResponsiveDialog>
  );
}
