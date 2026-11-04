import { romeDate, romeMinutes } from "@/lib/dates/rome";
import type { ClientRow } from "@/lib/rules/clients";

type VisibleClient = { id: string | null; name: string | null; phone: string | null; email: string | null; created_at: string | null };
type Stats = {
  client_id: string | null;
  visits: number | null;
  last_visit_at: string | null;
  next_at: string | null;
  usual_service_id: string | null;
  usual_member_id: string | null;
};

/** Mette insieme anagrafica (clients_visible) e statistiche (client_stats) nelle righe della rubrica. */
export function buildClientRows(
  clients: VisibleClient[],
  stats: Stats[],
  serviceNames: Map<string, string>,
  memberNames: Map<string, string>,
  todayClientIds: Set<string>,
): ClientRow[] {
  const byClient = new Map(stats.filter((s) => s.client_id).map((s) => [s.client_id!, s]));
  return clients.flatMap((c) => {
    if (!c.id || !c.name) return [];
    const s = byClient.get(c.id);
    const next = s?.next_at ? new Date(s.next_at) : null;
    return [
      {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        createdAt: c.created_at ?? new Date(0).toISOString(),
        visits: Number(s?.visits ?? 0),
        lastVisitDate: s?.last_visit_at ? romeDate(new Date(s.last_visit_at)) : null,
        nextDate: next ? romeDate(next) : null,
        nextMin: next ? romeMinutes(next) : null,
        usualServiceName: s?.usual_service_id ? (serviceNames.get(s.usual_service_id) ?? null) : null,
        usualMemberName: s?.usual_member_id ? (memberNames.get(s.usual_member_id) ?? null) : null,
        hasToday: todayClientIds.has(c.id),
      },
    ];
  });
}
