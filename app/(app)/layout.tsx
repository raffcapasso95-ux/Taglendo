import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { requireSalon } from "@/lib/auth/session";
import { initials } from "@/lib/rules/agenda";
import { env } from "@/lib/supabase/env";

/**
 * Tutto il gestionale richiede un utente con un salone che ha finito il primo avvio,
 * e sta dentro la barra laterale (desktop) o la barra in basso (telefono).
 */
async function Guard({ children }: { children: ReactNode }) {
  const { name, salon } = await requireSalon();
  return (
    <AppShell
      salonName={salon.name}
      bookingUrl={`${env.siteUrl()}/${salon.slug}`}
      userName={name}
      userInitials={initials(name)}
    >
      {children}
    </AppShell>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}
