"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { marketingCopy as copy } from "@/lib/copy/marketing";
import styles from "./Marketing.module.css";

/** La barra in alto: prende l'ombra quando si scorre. A destra va il pezzo che dipende da chi è collegato. */
export function SiteHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? `${styles.header} ${styles.headerScrolled}` : styles.header}>
      <div className={styles.headerRow}>
        <Link href="/" aria-label="Taglendo, inizio pagina" className={styles.logo}>
          <Image src="/brand/taglendo-logo.svg" alt="Taglendo" width={109} height={26} priority style={{ height: 26, width: "auto" }} />
        </Link>
        <nav className={styles.nav} aria-label="Sezioni">
          <Link href="/per-i-saloni#come" className={styles.navLink}>{copy.nav.how}</Link>
          <Link href="/per-i-saloni#prima" className={styles.navLink}>{copy.nav.before}</Link>
          <Link href="/per-i-saloni#prezzi" className={styles.navLink}>{copy.nav.prices}</Link>
          <Link href="/per-i-saloni#domande" className={styles.navLink}>{copy.nav.faq}</Link>
        </nav>
        <div className={styles.headerActions}>{children}</div>
      </div>
    </header>
  );
}
