import "server-only";
import { romeDate, dayRange } from "@/lib/dates/rome";
import { monthBounds } from "@/lib/dates/calendar";
import { formatDay, formatPrice, formatTime, TIME_ZONE } from "@/lib/dates/format";
import { createClient } from "@/lib/supabase/server";

export type ProfileStats = { month: string; clients: number; revenue: string; next: string | null };

/** I numeri della scheda: clienti e incasso del mese corrente e prossimo cliente, per chi guarda. */
export async function profileStats(memberId: string): Promise<ProfileStats> {
  const supabase = await createClient();
  const now = new Date();
  const today = romeDate(now);
  const { first, last } = monthBounds(today.slice(0, 7));
  const from = dayRange(first).start.toISOString();
  const to = dayRange(last).end.toISOString();
  const [month, next] = await Promise.all([
    supabase
      .from("appointments")
      .select("client_id, price_cents")
      .eq("member_id", memberId)
      .eq("status", "completato")
      .gte("starts_at", from)
      .lt("starts_at", to),
    supabase
      .from("appointments")
      .select("starts_at")
      .eq("member_id", memberId)
      .eq("status", "confermato")
      .gte("starts_at", now.toISOString())
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
  ]);
  const rows = month.data ?? [];
  const nextAt = next.data ? new Date(next.data.starts_at) : null;
  return {
    month: new Intl.DateTimeFormat("it-IT", { timeZone: TIME_ZONE, month: "long" }).format(now),
    clients: new Set(rows.map((r) => r.client_id)).size,
    revenue: formatPrice(rows.reduce((sum, r) => sum + r.price_cents, 0)),
    next: nextAt ? (romeDate(nextAt) === today ? formatTime(nextAt) : `${formatDay(nextAt).split(" ").slice(0, 2).join(" ")} ${formatTime(nextAt)}`) : null,
  };
}

