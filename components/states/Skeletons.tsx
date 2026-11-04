import type { CSSProperties } from "react";
import styles from "./States.module.css";

function Block({ w = "100%", h = 16, pill = false }: { w?: number | string; h?: number; pill?: boolean }) {
  const style: CSSProperties = { width: w, height: h };
  return <span className={pill ? `${styles.block} ${styles.pill}` : styles.block} style={style} aria-hidden="true" />;
}

const Wrap = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className={styles.page} role="status" aria-busy="true" aria-label={label}>
    {children}
  </div>
);

/** D2 · L'agenda mentre si carica: saluto, giorni, operatori e qualche appuntamento, nella stessa forma. */
export function AgendaSkeleton() {
  return (
    <Wrap label="Carico l’agenda">
      <Block w="45%" h={16} />
      <Block w="70%" h={36} />
      <div className={styles.strip}>
        {Array.from({ length: 7 }, (_, i) => (
          <Block key={i} h={68} />
        ))}
      </div>
      <div className={styles.row}>
        {[96, 112, 104].map((w) => (
          <Block key={w} w={w} h={44} pill />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`${styles.card} ${styles.row}`}>
          <Block w={56} h={40} />
          <div className={styles.col}>
            <Block w="60%" h={18} />
            <Block w="40%" h={14} />
          </div>
          <Block w={72} h={32} pill />
        </div>
      ))}
    </Wrap>
  );
}

/** D2 · Rubrica clienti: titolo, ricerca, filtri e righe. */
export function ListSkeleton() {
  return (
    <Wrap label="Carico l’elenco">
      <Block w="35%" h={14} />
      <Block w="50%" h={34} />
      <Block h={50} />
      <div className={styles.row}>
        {[88, 128, 120].map((w) => (
          <Block key={w} w={w} h={44} pill />
        ))}
      </div>
      <div className={styles.card}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={styles.row}>
            <Block w={40} h={40} pill />
            <div className={styles.col}>
              <Block w="55%" h={16} />
              <Block w="35%" h={12} />
            </div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

/** D2 · Schermate a schede (listino, impostazioni, link): titolo e tre riquadri. */
export function CardsSkeleton() {
  return (
    <Wrap label="Carico la pagina">
      <Block w="30%" h={14} />
      <Block w="55%" h={34} />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={styles.card}>
          <Block w="40%" h={16} />
          <Block h={14} />
          <Block w="80%" h={14} />
        </div>
      ))}
    </Wrap>
  );
}

/** Pagina pubblica o link personale: solo lo sfondo, per non lampeggiare di bianco. */
export function PublicSkeleton() {
  return <div className={styles.dark} role="status" aria-busy="true" aria-label="Carico la pagina" />;
}
