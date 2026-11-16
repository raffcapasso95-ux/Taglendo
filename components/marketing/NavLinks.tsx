"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/components/ui/cx";
import { SALONI, SALONI_END_ID, type NavItem } from "./navItems";
import styles from "./Land.module.css";

/** Quale sezione è in vista: l'ultima che ha superato un terzo dello schermo; oltre la chiusura, nessuna. */
function useActiveSection(ids: string[], enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("|");
  useEffect(() => {
    if (!enabled) return;
    const list = key.split("|").filter(Boolean);
    const line = () => window.innerHeight * 0.33;
    const update = () => {
      let cur: string | null = null;
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line()) cur = id;
      }
      const end = document.getElementById(SALONI_END_ID);
      if (end && end.getBoundingClientRect().top <= line()) cur = null;
      setActive((prev) => (prev === cur ? prev : cur));
    };
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [key, enabled]);
  return enabled ? active : null;
}

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/**
 * Le voci del menu, per la barra (computer) e per l'elenco del telefono.
 * Le sezioni della home sono link a `#id` (si scorre, e la voce della sezione in vista si sottolinea);
 * l'altra pagina ha una freccia, e quando ci si è dentro è la voce corrente.
 */
export function NavLinks({ items, current, layout, onNavigate }: { items: NavItem[]; current?: "funzioni"; layout: "bar" | "list"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const onHome = pathname === SALONI;
  const active = useActiveSection(
    items.flatMap((i) => (i.id ? [i.id] : [])),
    onHome,
  );
  return (
    <>
      {items.map((item) => {
        const here = item.kind === "section" && item.id === active;
        const isPage = item.kind === "page";
        const href = item.kind === "section" && onHome ? `#${item.id}` : item.href;
        return (
          <Link
            key={item.href}
            href={href}
            className={cx(layout === "bar" ? styles.navLink : styles.menuLink, isPage && styles.navPage)}
            aria-current={isPage && current === "funzioni" ? "page" : here ? "location" : undefined}
            onClick={onNavigate}
          >
            {item.label}
            {isPage ? <Arrow /> : null}
          </Link>
        );
      })}
    </>
  );
}
