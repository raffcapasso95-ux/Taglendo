import Link from "next/link";
import styles from "@/components/states/States.module.css";

/** Pagina che non esiste: dice cosa è successo e dove andare. */
export default function NotFound() {
  return (
    <div className={styles.error}>
      <span className={styles.errorIcon} aria-hidden="true">?</span>
      <h1 className={styles.errorTitle}>Questa pagina non c’è</h1>
      <p className={styles.errorText}>Il link potrebbe essere sbagliato o la pagina non esiste più.</p>
      <div className={styles.errorActions}>
        <Link href="/" className={styles.errorText}>Torna alla pagina iniziale</Link>
      </div>
    </div>
  );
}
