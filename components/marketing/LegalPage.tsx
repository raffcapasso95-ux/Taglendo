import type { ReactNode } from "react";
import { company } from "@/lib/site";
import styles from "./Marketing.module.css";

type LegalSection = { id: string; title: string; body: ReactNode };

type Props = {
  title: string;
  lead: string;
  sections: LegalSection[];
  /** Per le pagine ancora in bozza: il riquadro "Bozza da far verificare". */
  draft?: boolean;
};

/** Pagina legale: indice a sinistra ("In questa pagina"), testo a destra, data di aggiornamento e avviso di bozza. */
export function LegalPage({ title, lead, sections, draft = true }: Props) {
  return (
    <div className={styles.legal}>
      <nav className={styles.toc} aria-label="In questa pagina">
        <span className={styles.eyebrow}>In questa pagina</span>
        <ol className={styles.tocList}>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={styles.tocLink}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>
      <article className={styles.article}>
        <span className={styles.updated}>Ultimo aggiornamento: {company.updated}</span>
        <h1 className={styles.h1}>{title}</h1>
        <p className={styles.lead}>{lead}</p>
        {draft ? (
          <div className={styles.draft} role="note">
            <span className={styles.draftTitle}>Bozza da far verificare</span>
            <span>Struttura e contenuti sono indicativi. Il testo finale va scritto o verificato da un consulente legale prima della pubblicazione.</span>
          </div>
        ) : null}
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className={styles.legalSection}>
            <h2 className={styles.legalH2}>{i + 1}. {s.title}</h2>
            {s.body}
          </section>
        ))}
      </article>
    </div>
  );
}

export const P = ({ children }: { children: ReactNode }) => <p className={styles.legalP}>{children}</p>;
export const List = ({ items }: { items: ReactNode[] }) => (
  <ul className={styles.legalList}>
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);
