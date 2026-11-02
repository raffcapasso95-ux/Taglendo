import Image from "next/image";
import type { ReactNode } from "react";
import { onboardingCopy } from "@/lib/copy/onboarding";
import styles from "./Frame.module.css";

const copy = onboardingCopy;

type Props = {
  /** 1–4 */
  step: number;
  /** Fino a che passo il salone è arrivato: i passi già fatti mostrano la spunta. */
  doneUpTo: number;
  title: string;
  lead?: ReactNode;
  /** Anteprima a destra (solo desktop). */
  preview: ReactNode;
  /** Pulsanti in fondo: Indietro (solo desktop) e Continua. */
  actions: ReactNode;
  children: ReactNode;
};

/**
 * A6–A9: sul telefono barra di avanzamento e pulsante in fondo; su desktop
 * passi a sinistra, modulo al centro e anteprima della pagina a destra.
 */
export function Frame({ step, doneUpTo, title, lead, preview, actions, children }: Props) {
  return (
    <div className={styles.frame}>
      <nav className={styles.nav} aria-label={copy.nav.title}>
        <Image src="/brand/taglendo-logo.svg" alt="Taglendo" width={112} height={36} style={{ width: 112, height: "auto" }} priority />
        <p className={styles.navTitle}>{copy.nav.title}</p>
        <ol className={styles.steps}>
          {copy.nav.steps.map((label, i) => {
            const n = i + 1;
            const done = n < step || n <= doneUpTo - 1;
            return (
              <li key={label} className={n === step ? styles.stepActive : styles.step} aria-current={n === step ? "step" : undefined}>
                <span className={done && n !== step ? styles.badgeDone : n === step ? styles.badgeActive : styles.badge} aria-hidden="true">
                  {done && n !== step ? "✓" : n}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
        <p className={styles.navNote}>{copy.nav.note}</p>
      </nav>

      <main className={styles.main}>
        <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step} aria-label={copy.step(step)}>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={n <= step ? styles.segOn : styles.seg} />
          ))}
        </div>
        <div className={styles.content}>
          <p className={styles.stepLabel}>{copy.step(step)}</p>
          <h1 className={styles.title}>{title}</h1>
          {lead ? <div className={styles.lead}>{lead}</div> : null}
          <div className={styles.body}>{children}</div>
        </div>
        <div className={styles.actions}>{actions}</div>
      </main>

      <aside className={styles.aside} aria-label={copy.preview.title}>
        <p className={styles.asideTitle}>{copy.preview.title}</p>
        {preview}
      </aside>
    </div>
  );
}
