import type { MetadataRoute } from "next";
import { env } from "@/lib/supabase/env";

/** I motori di ricerca vedono il sito e le pagine dei saloni; non l'app, l'accesso né le pagine personali. */
export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl().replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/agenda", "/clienti", "/link", "/listino", "/impostazioni", "/profilo", "/primo-avvio", "/pronto", "/invito/", "/accedi", "/verifica", "/password", "/nuova-password", "/auth/", "/*/prenotazione/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
