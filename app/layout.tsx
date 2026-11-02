import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({
  src: "../design/fonts/Manrope.ttf",
  weight: "400 700",
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Taglendo",
  description: "Agenda e prenotazioni online per barberie.",
};

export const viewport: Viewport = {
  themeColor: "#FFF7F0",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
