"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Card, ToastProvider, useToast } from "@/components/ui";
import { saveWeekHours } from "@/lib/listino/actions";
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
};

export function OrariView(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ canEdit, ownerName, week, todayWeekday, operatorNames }: Props) {
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
            {hours.perOperator}
            <span className={styles.navSub}>{hours.perOperatorSub}</span>
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
