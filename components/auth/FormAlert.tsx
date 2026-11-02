import type { ReactNode } from "react";
import styles from "./FormAlert.module.css";

/** Avviso d'errore del modulo (design-system .alert). */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div className={styles.alert} role="alert">
      {children}
    </div>
  );
}
