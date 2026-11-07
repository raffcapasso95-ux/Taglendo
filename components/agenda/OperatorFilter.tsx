import Link from "next/link";
import { cx } from "@/components/ui/cx";
import { operatorColor, type Operator } from "@/lib/rules/agenda";
import { OperatorAvatar } from "./OperatorAvatar";
import styles from "./Agenda.module.css";

type Props = { operators: Operator[]; selected: string | null; date: string; today: string };

const hrefFor = (date: string, today: string, operator: string | null) => {
  const q = new URLSearchParams();
  if (date !== today) q.set("g", date);
  if (operator) q.set("op", operator);
  const s = q.toString();
  return s ? `/agenda?${s}` : "/agenda";
};

/** "Tutti" e un pulsante per ogni barbiere. Con un solo barbiere visibile non serve. */
export function OperatorFilter({ operators, selected, date, today }: Props) {
  if (operators.length < 2) return null;
  return (
    <nav className={styles.filter} aria-label="Barbieri">
      <Link href={hrefFor(date, today, null)} className={cx(styles.filterItem, selected === null && styles.filterOn)} aria-current={selected === null ? "true" : undefined} scroll={false}>
        Tutti
      </Link>
      {operators.map((o, i) => (
        <Link
          key={o.id}
          href={hrefFor(date, today, o.id)}
          className={cx(styles.filterItem, selected === o.id && styles.filterOn)}
          aria-current={selected === o.id ? "true" : undefined}
          scroll={false}
        >
          <span className={styles.filterAvatar}>
            <OperatorAvatar name={o.name} colorIndex={operatorColor(o, i)} size="sm" />
          </span>
          {o.name}
        </Link>
      ))}
    </nav>
  );
}
