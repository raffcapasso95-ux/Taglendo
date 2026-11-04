import type { MetadataRoute } from "next";

/** Rende il gestionale installabile (Aggiungi alla schermata Home). Colori e icone da tokens/tokens.css e assets/taglendo-icon.svg. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taglendo",
    short_name: "Taglendo",
    description: "Agenda e prenotazioni online per barberie.",
    lang: "it",
    start_url: "/agenda",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF7F0",
    theme_color: "#3E2532",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Agenda", url: "/agenda" }, { name: "Clienti", url: "/clienti" }],
  };
}
