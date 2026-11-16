"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { saloniCopy } from "@/lib/copy/saloni";
import { NavLinks } from "./NavLinks";
import type { NavItem } from "./navItems";
import styles from "./Land.module.css";

const copy = saloniCopy.menu;

/**
 * Il menu di telefono e tablet (sotto i 1024 px, dove la barra delle voci non c'è): un pulsante nella testata che apre un foglio con le stesse voci
 * e, in fondo, le azioni dell'account. Si chiude con Esc, toccando una voce, o ruotando fino a vedere la barra.
 */
export function MobileMenu({ items, current, children }: { items: NavItem[]; current?: "funzioni"; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const header = document.querySelector<HTMLElement>("[data-land-header]");
    // con il foglio aperto la testata è piena, come dopo lo scorrimento (LandEffects lo rispetta anche se la pagina si muove)
    header?.setAttribute("data-menu", "open");
    header?.setAttribute("data-scrolled", "true");
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    // il fuoco va al foglio (non alla prima voce, che si vedrebbe cerchiata appena si apre)
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onWide = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    const btn = button.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
      html.style.overflow = before;
      header?.removeAttribute("data-menu");
      if (header) header.setAttribute("data-scrolled", header.dataset.solid === "true" || window.scrollY > 24 ? "true" : "false");
      btn?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <div className={styles.menuWrap}>
      <button type="button" ref={button} className={styles.menuBtn} aria-expanded={open} aria-controls={id} aria-label={open ? copy.close : copy.open} onClick={() => setOpen(!open)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open ? <button type="button" className={styles.menuScrim} aria-label={copy.close} tabIndex={-1} onClick={() => setOpen(false)} /> : null}
      <div id={id} ref={panel} className={styles.menuPanel} role="dialog" aria-modal="true" aria-label={copy.title} tabIndex={-1} hidden={!open}>
        <nav aria-label={copy.title} className={styles.menuList}>
          <NavLinks items={items} current={current} layout="list" onNavigate={() => setOpen(false)} />
        </nav>
        <div className={styles.menuFoot} onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
          {children}
        </div>
      </div>
    </div>
  );
}
