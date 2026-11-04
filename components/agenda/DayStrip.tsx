"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cx } from "@/components/ui/cx";
import type { StripDay } from "@/lib/agenda/load";
import styles from "./Agenda.module.css";

type Props = { days: StripDay[]; selected: string; today: string; operator: string | null };

const hrefFor = (date: string, today: string, operator: string | null) => {
  const q = new URLSearchParams();
  if (date !== today) q.set("g", date);
  if (operator) q.set("op", operator);
  const s = q.toString();
  return s ? `/agenda?${s}` : "/agenda";
};

/** Striscia scorrevole dei giorni. I giorni chiusi sono più chiari; il puntino dice che ci sono appuntamenti. */
export function DayStrip({ days, selected, today, operator }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-current="date"]');
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selected]);

  return (
    <nav className={styles.strip} aria-label="Giorni" ref={ref}>
      {days.map((d) => {
        const current = d.date === selected;
        return (
          <Link
            key={d.date}
            href={hrefFor(d.date, today, operator)}
            className={cx(styles.dayChip, current && styles.dayChipOn, d.closed && !current && styles.dayChipClosed)}
            aria-current={current ? "date" : undefined}
            // il nome accessibile riparte dal testo che si vede (es. "Gio 5 dic"), poi dice il giorno per esteso
            aria-label={`${d.weekday} ${d.number}${d.month ? ` ${d.month}` : ""}, ${d.label}`}
            scroll={false}
          >
            <span className={styles.dayDow}>{d.weekday}</span> <span className={styles.dayNum}>{d.number}</span>{" "}
            <span className={styles.daySub}>
              {d.month ? d.month : d.hasAppointments ? <span className={cx(styles.dot, current && styles.dotOn)} aria-hidden="true" /> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
