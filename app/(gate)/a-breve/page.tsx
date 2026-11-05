import type { Metadata } from "next";
import Image from "next/image";
import { gateCopy } from "@/lib/copy/gate";
import styles from "./Soon.module.css";

const copy = gateCopy.soon;

export const metadata: Metadata = {
  title: copy.title,
  robots: { index: false, follow: false },
};

/** Pagina che vede chiunque non abbia il permesso, finché il sito è in anteprima privata. */
export default function Page() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Image src="/brand/taglendo-logo.svg" alt={copy.logoAlt} width={168} height={40} className={styles.logo} priority />
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.headline}>{copy.headline}</h1>
        <p className={styles.text}>{copy.text}</p>
        <span className={styles.bar} aria-hidden="true" />
      </div>
    </main>
  );
}
