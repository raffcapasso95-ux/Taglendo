import { Suspense, type ReactNode } from "react";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { AppShell } from "@/components/app/AppShell";
import { requireSalon } from "@/lib/auth/session";
import { initials } from "@/lib/rules/agenda";
import { env } from "@/lib/supabase/env";

/**
 * Tutto il gestionale richiede un utente con un salone che ha finito il primo avvio,
 * e sta dentro la barra laterale (desktop) o la testata con il menu (telefono).
 */
async function Guard({ children }: { children: ReactNode }) {
  const { name, salon, role } = await requireSalon();
  return (
    <AppShell
      salonName={salon.name}
      bookingUrl={`${env.siteUrl()}/${salon.slug}`}
      userName={name}
      userInitials={initials(name)}
      isOwner={role === "owner"}
    >
      {children}
    </AppShell>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}
