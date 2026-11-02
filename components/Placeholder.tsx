import styles from "./Placeholder.module.css";

type Props = {
  title: string;
  phase: string;
  design: string;
};

/** Pagina segnaposto: la rotta esiste, il contenuto arriva nella fase indicata. */
export function Placeholder({ title, phase, design }: Props) {
  return (
    <main className={styles.wrap}>
      <p className={styles.eyebrow}>{phase}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.note}>Design: {design}</p>
    </main>
  );
}
