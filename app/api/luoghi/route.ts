import { suggestComuni } from "@/lib/places/comuni";

/** Suggerimenti di città per la ricerca dei saloni: dall'elenco dei comuni incluso nel sito (nessun servizio esterno). */
export function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  const suggestions = suggestComuni(q, 6).map((c) => ({ name: c.name, prov: c.prov }));
  return Response.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
