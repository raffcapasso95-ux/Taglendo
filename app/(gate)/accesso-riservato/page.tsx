import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { GateForm } from "@/components/gate/GateForm";
import styles from "@/components/gate/Gate.module.css";
import { gateCopy } from "@/lib/copy/gate";

const copy = gateCopy.login;

export const metadata: Metadata = {
  title: copy.title,
  robots: { index: false, follow: false },
};

/** Utente e password solo per chi deve vedere il sito in anteprima. Non è linkata da nessuna parte. */
export default function Page() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Image src="/brand/taglendo-logo.svg" alt="Taglendo" width={134} height={32} className={styles.logo} />
        <div>
          <h1 className={styles.title}>{copy.heading}</h1>
          <p className={styles.text}>{copy.text}</p>
        </div>
        <Suspense fallback={null}>
          <GateForm />
        </Suspense>
        <Link href="/a-breve" className={styles.back}>
          {copy.back}
        </Link>
      </div>
    </main>
  );
}
