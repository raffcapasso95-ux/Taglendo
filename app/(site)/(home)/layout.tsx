import type { Viewport } from "next";
import { LandShell } from "@/components/marketing/LandShell";

/** La barra del browser ha lo stesso prugna della testata. */
export const viewport: Viewport = { themeColor: "#3E2532", viewportFit: "cover" };

/** La home per i clienti: apertura scura con la ricerca. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <LandShell audience="clienti">{children}</LandShell>;
}
