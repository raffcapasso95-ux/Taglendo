"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import styles from "./Shop.module.css";

/** La barra in basso del telefono: si abbassa mentre il cliente è dentro la prenotazione, per non coprirne i campi. */
export function BottomBar({ hideWhileVisible, children }: { hideWhileVisible?: string; children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!hideWhileVisible) return;
    const target = document.getElementById(hideWhileVisible);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setHidden(Boolean(entry?.isIntersecting)), { rootMargin: "-20% 0px -20% 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hideWhileVisible]);

  return (
    <div className={cx(styles.bar, hidden && styles.barHidden)} aria-hidden={hidden || undefined} inert={hidden}>
      {children}
    </div>
  );
}
