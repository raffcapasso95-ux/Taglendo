import { Suspense, type ReactNode } from "react";
import { requireSalon } from "@/lib/auth/session";

/**
 * Tutto il gestionale richiede un utente con un salone che ha finito il primo avvio.
 * La barra laterale e la navigazione arrivano con la Fase 2.
 */
async function Guard({ children }: { children: ReactNode }) {
  await requireSalon();
  return children;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}
