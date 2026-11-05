import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./AuthShell.module.css";

type Props = {
  /** Titolo nell'intestazione del telefono. */
  title: string;
  /** Titolo sopra il modulo su desktop (se diverso da quello del telefono). */
  desktopTitle?: string;
  lead?: ReactNode;
  desktopLead?: ReactNode;
  /** Frase grande nel pannello albicocca su desktop. */
  headline: string;
  chips?: readonly string[];
  /** "‹ Indietro" in alto. Su desktop compare solo con desktopBack. */
  back?: { href: string; label: string };
  desktopBack?: boolean;
  /** Elemento decorativo sull'intestazione del telefono (A1). */
  decoration?: ReactNode;
  /** Riga in fondo (es. "Non hai un account? Prova gratis"). */
  footer?: ReactNode;
  /** La riga in fondo c'è solo su desktop (A2). */
  footerDesktopOnly?: boolean;
  children: ReactNode;
};

/**
 * Struttura di A1–A5 e C7: sul telefono intestazione albicocca e foglio chiaro
 * che sale sopra; su desktop pannello albicocca a sinistra e modulo a destra.
 */
export function AuthShell({
  title,
  desktopTitle,
  lead,
  desktopLead,
  headline,
  chips,
  back,
  desktopBack = false,
  decoration,
  footer,
  footerDesktopOnly = false,
  children,
}: Props) {
  const backLink = back ? (
    <Link href={back.href} className={styles.back}>
      <span aria-hidden="true">‹</span> {back.label}
    </Link>
  ) : null;

  return (
    <main className={styles.shell}>
      <section className={styles.panel}>
        {/* Telefono */}
        <div className={styles.hero}>
          {backLink}
          {decoration}
          <Image src="/brand/taglendo-icon.svg" alt="Taglendo" width={44} height={44} className={styles.icon} priority />
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>{title}</h1>
            {lead ? <p className={styles.heroLead}>{lead}</p> : null}
          </div>
          {chips ? (
            <ul className={styles.chips}>
              {chips.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Desktop */}
        <div className={styles.side}>
          <Image src="/brand/taglendo-logo.svg" alt="Taglendo" width={150} height={36} className={styles.logo} style={{ width: "var(--auth-logo-width, 150px)", height: "auto" }} priority />
          <p className={styles.headline}>{headline}</p>
          {chips ? (
            <ul className={styles.chips}>
              {chips.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
          <Image
            src="/images/shot-agenda-desktop.png"
            alt=""
            width={760}
            height={487}
            className={styles.shot}
            style={{ height: "auto" }}
            sizes="760px"
          />
        </div>
      </section>

      <section className={styles.formArea}>
        <div className={styles.form}>
          <div className={styles.formHead}>
            {desktopBack ? backLink : null}
            <h2 className={styles.formTitle}>{desktopTitle ?? title}</h2>
            {desktopLead ?? lead ? <p className={styles.formLead}>{desktopLead ?? lead}</p> : null}
          </div>
          {children}
          <div className={styles.spacer} />
          {footer ? <p className={footerDesktopOnly ? `${styles.footer} ${styles.desktopOnly}` : styles.footer}>{footer}</p> : null}
        </div>
      </section>
    </main>
  );
}
