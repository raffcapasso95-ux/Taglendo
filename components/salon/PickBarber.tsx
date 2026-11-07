"use client";

import type { ReactNode } from "react";

/** «Prenota con …»: porta alla prenotazione e le dice quale barbiere è stato scelto. */
export function PickBarber({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <a
      href="#prenota"
      className={className}
      onClick={() => {
        // la prenotazione sta già in pagina: le si manda la scelta dopo che lo scorrimento è partito
        window.dispatchEvent(new CustomEvent("shop:pick-barber", { detail: { id } }));
      }}
    >
      {children}
    </a>
  );
}
