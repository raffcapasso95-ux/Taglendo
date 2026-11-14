"use client";

import type { ReactNode } from "react";

type Pick = { kind: "barber" | "service"; id: string };

/**
 * «Prenota» su un servizio o «Prenota con …» su un barbiere: porta al modulo di prenotazione
 * e gli dice cosa è stato scelto (il modulo sta già in pagina).
 */
export function BookPick({ kind, id, className, children, label }: Pick & { className?: string; children: ReactNode; label?: string }) {
  return (
    <a
      href="#prenota"
      className={className}
      aria-label={label}
      onClick={() => {
        window.dispatchEvent(new CustomEvent(kind === "barber" ? "shop:pick-barber" : "shop:pick-service", { detail: { id } }));
      }}
    >
      {children}
    </a>
  );
}
