import { cx } from "@/components/ui/cx";
import styles from "./Agenda.module.css";

/** Cerchio con l'iniziale del barbiere. Colori nell'ordine delle poltrone: prugna, albicocca, pesca, grigio. */
export function OperatorAvatar({ name, colorIndex, size = "md" }: { name: string; colorIndex: number; size?: "sm" | "md" }) {
  return (
    <span className={cx(styles.avatar, styles[`op${colorIndex % 4}` as "op0"], size === "sm" && styles.avatarSm)} aria-hidden="true">
      {Array.from(name.trim())[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
