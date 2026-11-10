"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/components/ui/cx";
import { markActivitySeen } from "@/lib/activity/actions";
import { activityText, dayGroup, type ActivityRow } from "@/lib/activity/text";
import { romeDate, romeMinutes } from "@/lib/dates/rome";
import { formatMinutes } from "@/lib/rules/hours";
import styles from "./Activity.module.css";

type Row = ActivityRow & { unread: boolean };
type Props = { rows: Row[]; today: string; yesterday: string; multi: boolean };

const ICON: Record<ActivityRow["kind"], string> = {
  online: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  nuovo: "M12 5v14M5 12h14",
  spostato: "M4 12h13M13 7l5 5-5 5",
  annullato: "M7 7l10 10M17 7 7 17",
  completato: "M5 12.5l4.5 4.5L19 7.5",
  non_presentato: "M12 7v6M12 17h.01",
};

/**
 * NUOVO: «Notifiche». Cosa è successo agli appuntamenti: prenotazioni online, nuovi, spostati, annullati,
 * completati, non presentati, con chi l'ha fatto. Le nuove sono in evidenza; aprendo la pagina diventano lette.
 */
export function ActivityView({ rows, today, yesterday, multi }: Props) {
  const router = useRouter();
  // le novità restano in evidenza per tutta la visita, anche dopo averle segnate come lette
  const [fresh] = useState(() => new Set(rows.filter((r) => r.unread).map((r) => r.id)));
  const unread = rows.filter((r) => r.unread).length;

  useEffect(() => {
    if (unread === 0) return;
    void markActivitySeen().then(() => router.refresh());
  }, [unread, router]);

  const groups: Array<{ label: string; items: Row[] }> = [];
  for (const r of rows) {
    const label = dayGroup(r.created_at, today, yesterday);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(r);
    else groups.push({ label, items: [r] });
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Notifiche</h1>
        <p className={styles.sub}>{fresh.size > 0 ? (fresh.size === 1 ? "1 novità dall’ultima volta" : `${fresh.size} novità dall’ultima volta`) : "Cosa è successo agli appuntamenti del salone."}</p>
      </header>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Ancora niente da segnalare</p>
          <p className={styles.sub}>Qui vedrai le prenotazioni online, gli appuntamenti fissati, spostati, annullati e completati.</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.label} className={styles.group} aria-label={g.label}>
            <h2 className={styles.groupTitle}>{g.label}</h2>
            <ul className={styles.list}>
              {g.items.map((r) => {
                const t = activityText(r, today, multi);
                const day = r.starts_at ? romeDate(new Date(r.starts_at)) : null;
                const href = day ? (day === today ? "/agenda" : `/agenda?g=${day}`) : "/agenda";
                return (
                  <li key={r.id}>
                    <Link href={href} className={cx(styles.row, fresh.has(r.id) && styles.rowUnread)}>
                      <span className={cx(styles.icon, styles[`k_${r.kind}` as "k_nuovo"])} aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d={ICON[r.kind]} />
                        </svg>
                      </span>
                      <span className={styles.text}>
                        <span className={styles.rowTitle}>
                          {fresh.has(r.id) ? (
                            <>
                              <span className={styles.dot} aria-hidden="true" />
                              <span className="visually-hidden">Nuova: </span>
                            </>
                          ) : null}
                          {t.title}
                        </span>
                        <span className={styles.detail}>{t.detail}</span>
                      </span>
                      <span className={styles.time}>{formatMinutes(romeMinutes(new Date(r.created_at)))}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
