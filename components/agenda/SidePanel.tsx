import { clock, firstName, span, type Column, type DayModel } from "@/lib/rules/agenda";
import { OperatorAvatar } from "./OperatorAvatar";
import styles from "./Agenda.module.css";

type Line = { key: string; name: string; colorIndex: number; label: string; busy: boolean; who: string | null };

/** Per ogni barbiere: chi c'è in poltrona adesso, o il prossimo cliente. */
function lines(columns: Column[], isToday: boolean, nowMin: number): Line[] {
  return columns.map((c) => {
    const live = c.appts.filter((a) => a.status === "confermato");
    const current = isToday ? live.find((a) => a.startMin <= nowMin && nowMin < a.endMin) : undefined;
    const next = current ?? live.find((a) => (isToday ? a.startMin > nowMin : true));
    return {
      key: c.operator.id,
      name: c.operator.name,
      colorIndex: c.colorIndex,
      busy: Boolean(current),
      label: current ? `${c.operator.name} · in poltrona` : next ? `${c.operator.name} · alle ${clock(next.startMin)}` : `${c.operator.name} · libero`,
      who: next ? next.clientName : null,
    };
  });
}

/** Colonna di destra su desktop: "Adesso in salone" e "Primi posti liberi". */
export function SidePanel({ day, title }: { day: DayModel; title: string }) {
  const rows = lines(day.columns, day.isToday, day.nowMin);
  return (
    <aside className={styles.side} aria-label="Adesso in salone">
      <section className={styles.sideSection}>
        <h2 className={styles.sideTitle}>{title}</h2>
        <ul className={styles.sideList}>
          {rows.map((r) => (
            <li key={r.key} className={r.busy ? styles.sideRowBusy : styles.sideRow}>
              <OperatorAvatar name={r.name} colorIndex={r.colorIndex} size="sm" />
              <span className={styles.sideText}>
                <span className={styles.sideLabel}>
                  <span className={r.busy ? styles.dotBusy : styles.dotFree} aria-hidden="true" />
                  {r.label}
                </span>
                <span className={styles.sideName}>{r.who ?? "Nessun altro cliente"}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      {day.freeNext.length > 0 ? (
        <section className={styles.freeSection}>
          <h2 className={styles.freeTitle}>{day.freeNext.length > 1 ? "Primi posti liberi" : "Primo posto libero"}</h2>
          <ul className={styles.sideList}>
            {day.freeNext.map((f) => (
              <li key={`${f.memberId}-${f.start}`} className={styles.freeRow}>
                <OperatorAvatar name={f.name} colorIndex={f.colorIndex} size="sm" />
                <span className={styles.sideText}>
                  <span className={styles.freeWhen}>{f.now ? "Libero adesso" : `Libero dalle ${clock(f.start)}`}</span>
                  <span className={styles.freeSub}>
                    {firstName(f.name)} · {span(f.end - f.start)} · fino alle {clock(f.end)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
