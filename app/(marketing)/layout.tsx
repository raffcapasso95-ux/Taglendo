import type { Viewport } from "next";
import { LandShell } from "@/components/marketing/LandShell";

/** La barra del browser ha lo stesso prugna della testata. */
export const viewport: Viewport = { themeColor: "#3E2532", viewportFit: "cover" };

/** Le pagine legali (privacy, termini, cookie): stessa testata e stesso piè di pagina del resto del sito. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandShell audience="clienti" solid>
      {children}
    </LandShell>
  );
}
