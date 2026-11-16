import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/session";

/** Tutte le pagine del gestionale: solo un amministratore entra (gli altri trovano «pagina non trovata»). */
async function Guard({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell email={admin.email ?? ""}>{children}</AdminShell>;
}

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}
