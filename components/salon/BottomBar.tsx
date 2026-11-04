"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./Salon.module.css";

/** La barra in basso del telefono: si nasconde mentre il cliente è dentro la prenotazione, per non coprirne i campi. */
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

  return <div className={hidden ? `${styles.bar} ${styles.barHidden}` : styles.bar} aria-hidden={hidden || undefined} inert={hidden}>{children}</div>;
}
