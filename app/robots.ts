import type { MetadataRoute } from "next";
import { gateEnabled } from "@/lib/gate";
import { env } from "@/lib/supabase/env";

/** I motori di ricerca vedono il sito e le pagine dei saloni; non l'app, l'accesso né le pagine personali. */
export default function robots(): MetadataRoute.Robots {
  // anteprima privata: nessun motore di ricerca deve indicizzare niente
  if (gateEnabled()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  const base = env.siteUrl().replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/agenda", "/clienti", "/link", "/salone", "/statistiche", "/notifiche", "/listino", "/impostazioni", "/profilo", "/primo-avvio", "/pronto", "/invito/", "/accedi", "/cerca?", "/verifica", "/password", "/nuova-password", "/auth/", "/*/prenotazione/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
