import type { ReactNode } from "react";
import { onboardingCopy } from "@/lib/copy/onboarding";
import styles from "./Preview.module.css";

type Props = {
  name: string;
  address: string;
  phone: string;
  /** Contenuto sotto l'intestazione, diverso a ogni passo. */
  children?: ReactNode;
};

/** "Città" dall'indirizzo: quello che segue l'ultima virgola, in maiuscolo. */
export function areaFromAddress(address: string): string {
  const i = address.lastIndexOf(",");
  return i >= 0 ? address.slice(i + 1).trim().toUpperCase() : "";
}

/** Anteprima dell'intestazione della pagina di prenotazione. Solo desktop. */
export function Preview({ name, address, phone, children }: Props) {
  const area = areaFromAddress(address);
  const line = [address, phone].filter(Boolean).join(" · ");
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        {area ? <p className={styles.area}>{area}</p> : null}
        <p className={styles.name}>{name || " "}</p>
        {line ? <p className={styles.line}>{line}</p> : null}
      </div>
      {children ? <div className={styles.body}>{children}</div> : null}
    </div>
  );
}

export function PreviewNote() {
  return <p className={styles.note}>{onboardingCopy.preview.salon}</p>;
}

export function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export function PreviewRows({ rows }: { rows: Array<{ label: string; value: string; sub?: string }> }) {
  return (
    <ul className={styles.rows}>
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`} className={styles.row}>
          <span className={styles.rowLabel}>
            {r.label}
            {r.sub ? <span className={styles.rowSub}>{r.sub}</span> : null}
          </span>
          <span className={styles.rowValue}>{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function PreviewChips({ people }: { people: Array<{ initial: string; name: string }> }) {
  return (
    <ul className={styles.chips}>
      {people.map((p) => (
        <li key={p.name} className={styles.chip}>
          <span className={styles.avatar} aria-hidden="true">
            {p.initial}
          </span>
          {p.name}
        </li>
      ))}
    </ul>
  );
}
