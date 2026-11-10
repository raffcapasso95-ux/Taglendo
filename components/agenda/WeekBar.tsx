import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import type { AgendaData } from "@/lib/agenda/load";
import { AgendaCalendar } from "./AgendaCalendar";
import { agendaHref } from "./href";
import styles from "./Agenda.module.css";

type Props = { week: AgendaData["week"]; selected: string; today: string; operator: string | null; children?: ReactNode };

const Arrow = ({ dir }: { dir: "prev" | "next" }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "prev" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"} />
  </svg>
);

/**
 * NUOVO: la settimana del giorno scelto, compatta. Su computer una riga sola: mese, «‹ Oggi ›», sette giorni,
 * calendario e (in `children`) i barbieri. Sul telefono i giorni sopra, frecce, calendario e barbieri sotto.
 * I giorni chiusi sono tratteggiati; il puntino dice che ci sono appuntamenti.
 */
export function WeekBar({ week, selected, today, operator, children }: Props) {
  return (
    <div className={styles.week}>
      <p className={styles.weekMonth}>{week.label}</p>
      <nav className={styles.weekNav} aria-label="Settimane">
        <Link href={agendaHref(week.prev, today, operator)} className={styles.weekArrow} aria-label="Settimana prima" scroll={false}>
          <Arrow dir="prev" />
        </Link>
        <Link href={agendaHref(today, today, operator)} className={cx(styles.weekToday, selected === today ? styles.weekTodayOn : styles.weekTodayAway)} aria-current={selected === today ? "date" : undefined} scroll={false}>
          Oggi
        </Link>
        <Link href={agendaHref(week.next, today, operator)} className={styles.weekArrow} aria-label="Settimana dopo" scroll={false}>
          <Arrow dir="next" />
        </Link>
      </nav>
      <nav className={styles.weekDays} aria-label="Giorni">
        {week.days.map((d) => {
          const current = d.date === selected;
          const isToday = d.date === today;
          return (
            <Link
              key={d.date}
              href={agendaHref(d.date, today, operator)}
              className={cx(styles.weekDay, current && styles.weekDayOn, d.closed && !current && styles.weekDayClosed, isToday && !current && styles.weekDayToday)}
              aria-current={current ? "date" : undefined}
              aria-label={`${d.weekday} ${d.number}, ${d.label}${isToday ? ", oggi" : ""}`}
              scroll={false}
            >
              {/* gli spazi tengono il testo visibile («Mer 11») dentro il nome accessibile */}
              <span className={styles.dayDow}>{d.weekday}</span> <span className={styles.dayNum}>{d.number}</span>{" "}
              <span className={styles.daySub}>{d.hasAppointments ? <span className={styles.dot} aria-hidden="true" /> : null}</span>
            </Link>
          );
        })}
      </nav>
      <AgendaCalendar selected={selected} today={today} operator={operator} />
      {children}
    </div>
  );
}
