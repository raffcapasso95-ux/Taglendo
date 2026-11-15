"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, Segmented, ToastProvider, useToast } from "@/components/ui";
import { saveOperatorWeek, saveWeekHours } from "@/lib/listino/actions";
import { listinoCopy } from "@/lib/copy/listino";
import type { WeekDay } from "@/lib/rules/hours";
import { canSaveWeek, weekSummary } from "@/lib/rules/listino";
import { ListinoTabs } from "./ListinoView";
import { WeekEditor } from "./WeekEditor";
import styles from "./Listino.module.css";

const copy = listinoCopy;
const hours = copy.hoursPage;

type Props = {
  canEdit: boolean;
  ownerName: string;
  week: WeekDay[];
  todayWeekday: number;
  operatorNames: string;
  /** I barbieri attivi, ognuno con la sua settimana (null: segue il salone). */
  team: Array<{ id: string; name: string; week: WeekDay[] | null }>;
};

export function OrariView(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ canEdit, ownerName, week, todayWeekday, operatorNames, team }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [saving, startSave] = useTransition();
  const summary = weekSummary(week, todayWeekday);

  /** Salva la settimana: dai giorni (interruttore) o dal foglio di un giorno. */
  const save = (next: WeekDay[], done?: () => void) =>
    startSave(async () => {
      const result = await saveWeekHours(next);
      if (!result.ok) return toast(result.error);
      toast(copy.toasts.hoursSaved, copy.toasts.hoursSavedSub(result.outside));
      done?.();
      router.refresh();
    });

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        {!canEdit ? <p className={styles.note}>{copy.barberNote(ownerName)}</p> : null}
      </header>

      <ListinoTabs active="hours" />

      <section className={styles.summary} aria-label={hours.summaryLabel}>
        <span className={styles.summaryIcon} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
        </span>
        <div>
          <p className={styles.summaryMain}>{summary.main}</p>
          <p className={styles.summarySub}>{summary.sub}</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="week-title">
        <div className={styles.sectionHead}>
          <h2 id="week-title" className={styles.sectionTitle}>
            {hours.week}
          </h2>
          {canEdit ? <span className={styles.count}>{hours.weekHint}</span> : null}
        </div>
        <WeekEditor
          week={week}
          canEdit={canEdit}
          saving={saving}
          onChange={(next, done) => {
            if (!canSaveWeek(next)) return toast(copy.errors.hours);
            save(next, done);
          }}
        />
        <p className={styles.note}>{hours.note}</p>
      </section>

      <TeamHours team={team} salonWeek={week} canEdit={canEdit} />

      <Card flush>
        <Link href="/listino/chiusure" className={styles.navRow}>
          <span>
            {copy.closures}
            <span className={styles.navSub}>{hours.closuresSub}</span>
          </span>
          <span aria-hidden="true">›</span>
        </Link>
        <Link href="/impostazioni/operatori" className={styles.navRow}>
          <span>
            {copy.operators}
            <span className={styles.navSub}>{operatorNames}</span>
          </span>
          <span aria-hidden="true">›</span>
        </Link>
      </Card>

    </main>
  );
}

const openDays = (week: WeekDay[]) => week.filter((d) => !d.closed && d.ranges.length > 0).length;

/** Gli orari di ogni barbiere: come il salone, oppure una settimana sua. Le assenze di un giorno stanno in «Ferie e chiusure». */
function TeamHours({ team, salonWeek, canEdit }: { team: Props["team"]; salonWeek: WeekDay[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [weeks, setWeeks] = useState<Record<string, WeekDay[] | null>>(() => Object.fromEntries(team.map((m) => [m.id, m.week])));
  const [saving, startSave] = useTransition();

  // si salva subito, come per gli orari del salone; il locale si aggiorna solo se è andata bene
  const save = (m: { id: string; name: string }, next: WeekDay[] | null, done?: () => void) =>
    startSave(async () => {
      const result = await saveOperatorWeek(m.id, next);
      if (!result.ok) return toast(result.error);
      setWeeks((w) => ({ ...w, [m.id]: next }));
      toast(next ? hours.teamSaved(m.name) : hours.teamReset(m.name), copy.toasts.hoursSavedSub(result.outside));
      done?.();
      router.refresh();
    });

  if (team.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="team-title">
      <div className={styles.sectionHead}>
        <h2 id="team-title" className={styles.sectionTitle}>
          {hours.team}
        </h2>
        {canEdit ? <span className={styles.count}>{hours.teamHint}</span> : null}
      </div>
      <ul className={styles.team}>
        {team.map((m) => {
          const own = weeks[m.id] ?? null;
          return (
            <li key={m.id} className={styles.member}>
              <div className={styles.memberHead}>
                <div className={styles.memberText}>
                  <p className={styles.memberName}>{m.name}</p>
                  <p className={styles.memberSub}>{own ? `${hours.ownHours} · ${hours.ownDays(openDays(own))}` : hours.sameAsSalon}</p>
                </div>
                {canEdit ? (
                  <Segmented
                    label={hours.ownHoursOn(m.name)}
                    options={[
                      { value: "salon", label: hours.sameAsSalon },
                      { value: "own", label: hours.ownHours },
                    ]}
                    value={own ? "own" : "salon"}
                    onChange={(v) => {
                      if (saving) return;
                      if (v === "own" && !own) save(m, salonWeek.map((d) => ({ closed: d.closed, ranges: d.ranges.map(([a, b]) => [a, b] as [number, number]) })));
                      if (v === "salon" && own) save(m, null);
                    }}
                  />
                ) : null}
              </div>
              {own ? (
                <WeekEditor
                  week={own}
                  canEdit={canEdit}
                  saving={saving}
                  onChange={(next, done) => {
                    if (!canSaveWeek(next) || openDays(next) === 0) return toast(copy.errors.hours);
                    save(m, next, done);
                  }}
                />
              ) : null}
              {canEdit ? (
                <Link href={`/listino/chiusure?operatore=${m.id}`} className={styles.absence}>
                  <span>
                    {hours.absence}
                    <span className={styles.navSub}>{hours.absenceHint}</span>
                  </span>
                  <span aria-hidden="true">›</span>
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className={styles.note}>{hours.teamNote}</p>
    </section>
  );
}
