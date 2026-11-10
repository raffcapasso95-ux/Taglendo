import { getUser } from "@/lib/auth/session";
import { parseSuggestions, placesRequest } from "@/lib/places/suggest";

/**
 * Suggerimenti di indirizzo per il primo avvio e la pagina del salone (Google Places).
 * Solo per chi ha fatto l'accesso; senza GOOGLE_MAPS_API_KEY risponde «spento» e il campo resta normale.
 */
export async function GET(request: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return Response.json({ enabled: false, suggestions: [] });
  if (!(await getUser())) return Response.json({ enabled: false, suggestions: [] }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 120);
  const token = (params.get("s") ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64) || undefined;
  if (q.length < 3) return Response.json({ enabled: true, suggestions: [] });

  const { url, body } = placesRequest(q, token);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return Response.json({ enabled: true, suggestions: [] });
    return Response.json({ enabled: true, suggestions: parseSuggestions(await res.json()) });
  } catch {
    return Response.json({ enabled: true, suggestions: [] });
  }
}
