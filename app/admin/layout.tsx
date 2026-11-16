import type { Metadata, Viewport } from "next";

/** Il gestionale non si indicizza e non si mette in cache dai motori di ricerca. */
export const metadata: Metadata = { title: "Gestionale · Taglendo", robots: { index: false, follow: false, nocache: true } };
export const viewport: Viewport = { themeColor: "#3E2532", viewportFit: "cover" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
