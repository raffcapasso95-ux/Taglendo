import styles from "./FloatingAppointment.module.css";

/** Scheda decorativa sull'intestazione di A1: un appuntamento che "sporge". */
export function FloatingAppointment() {
  return (
    <div className={styles.card} aria-hidden="true">
      <span className={styles.avatar}>M</span>
      <span className={styles.text}>
        <span className={styles.title}>10:30 · Giorgio C.</span>
        <span className={styles.sub}>Marco</span>
      </span>
    </div>
  );
}
