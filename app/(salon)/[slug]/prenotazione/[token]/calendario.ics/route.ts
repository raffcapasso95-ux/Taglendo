import { loadManage } from "@/lib/booking/manage";
import { buildIcs } from "@/lib/rules/ics";

export async function GET(_request: Request, ctx: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await ctx.params;
  const m = await loadManage(token);
  if (!m || m.salon.slug.toLowerCase() !== slug.toLowerCase() || m.status !== "confermato") return new Response("Link non valido.", { status: 404 });
  const ics = buildIcs({
    uid: `${m.publicCode}@taglendo`,
    start: new Date(m.startsAt),
    end: new Date(m.endsAt),
    summary: `${m.serviceName} da ${m.salon.name}`,
    location: [m.salon.address, m.salon.area?.split("·").pop()?.trim()].filter(Boolean).join(", ") || null,
    description: `Prenotazione ${m.publicCode}. Per spostare o annullare: ${m.salon.phone}.`,
  });
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${m.publicCode}.ics"`, "Cache-Control": "no-store" },
  });
}
