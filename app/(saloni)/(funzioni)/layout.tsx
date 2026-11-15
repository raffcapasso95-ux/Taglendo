import type { Viewport } from "next";
import { LandShell } from "@/components/marketing/LandShell";

export const viewport: Viewport = { themeColor: "#FFF7F0", viewportFit: "cover" };

/** Funzioni per i saloni: testata chiara e piena (la pagina non ha un'apertura su foto). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <LandShell audience="saloni" light current="funzioni">
      {children}
    </LandShell>
  );
}
