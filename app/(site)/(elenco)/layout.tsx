import type { Viewport } from "next";
import { LandShell } from "@/components/marketing/LandShell";

/** La barra del browser ha lo stesso prugna della testata. */
export const viewport: Viewport = { themeColor: "#3E2532", viewportFit: "cover" };

/** L'elenco dei saloni e le pagine per città: senza apertura scura, la testata è subito piena. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <LandShell audience="clienti" solid>{children}</LandShell>;
}
