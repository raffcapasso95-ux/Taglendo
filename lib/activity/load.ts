import "server-only";
import { addDays, romeDate } from "@/lib/dates/rome";
import { requireSalon } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUnread, type ActivityRow } from "./text";

const COLUMNS = "id, kind, by_client, actor_name, actor_member_id, client_name, service_name, member_name, starts_at, old_starts_at, old_member_name, created_at";

async function seenAt(memberId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("members").select("activity_seen_at").eq("id", memberId).maybeSingle();
  return data?.activity_seen_at ?? null;
}

/** Quante notifiche non lette (al massimo 99): per la campanella. Le proprie azioni non contano. */
export async function unreadActivity(): Promise<number> {
  const { id, salon } = await requireSalon();
  const supabase = await createClient();
  const seen = await seenAt(id);
  let q = supabase.from("activity").select("id", { count: "exact", head: true }).eq("salon_id", salon.id).or(`actor_member_id.is.null,actor_member_id.neq.${id}`);
  if (seen) q = q.gt("created_at", seen);
  const { count } = await q;
  return Math.min(count ?? 0, 99);
}

/** Le ultime notifiche del salone (quelle che chi guarda può vedere), con il segno di non letta. */
export async function loadActivity() {
  const { id, salon } = await requireSalon();
  const supabase = await createClient();
  const [seen, { data }, { count }] = await Promise.all([
    seenAt(id),
    supabase.from("activity").select(COLUMNS).eq("salon_id", salon.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("salon_id", salon.id).eq("active", true),
  ]);
  const today = romeDate(new Date());
  const rows = ((data ?? []) as ActivityRow[]).map((r) => ({ ...r, unread: isUnread(r, seen, id) }));
  return { salonId: salon.id, rows, today, yesterday: addDays(today, -1), multi: (count ?? 0) > 1 };
}
