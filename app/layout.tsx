import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { env } from "@/lib/supabase/env";
import "./globals.css";

const manrope = localFont({
  src: "../design/fonts/Manrope.ttf",
  weight: "400 700",
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl()),
  title: "Taglendo",
  description: "Agenda e prenotazioni online per barberie.",
  applicationName: "Taglendo",
  // favicon.ico e icon.svg arrivano dai file in app/; qui restano la 192 px e l'icona per iOS
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "48x48" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }] },
  appleWebApp: { capable: true, title: "Taglendo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FFF7F0",
  viewportFit: "cover",
  // l'app ha solo il tema chiaro: niente campi scuri se il telefono è in modalità scura
  colorScheme: "light",
  // la tastiera riduce l'area utile anche su Android, come su iPhone: i pulsanti in basso restano visibili
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
