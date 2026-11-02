import type { HTMLAttributes } from "react";
import { cx } from "./cx";
import styles from "./Card.module.css";

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Scheda di elenco senza padding interno (righe con bordo, es. preferenze). */
  flush?: boolean;
};

export function Card({ flush = false, className, ...rest }: Props) {
  return <div className={cx(styles.card, flush && styles.flush, className)} {...rest} />;
}
