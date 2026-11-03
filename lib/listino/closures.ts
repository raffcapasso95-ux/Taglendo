import "server-only";
import { requireSalon } from "@/lib/auth/session";
import { romeDate } from "@/lib/dates/rome";
import { splitClosures, type ClosureRow } from "@/lib/rules/closures";
import { createClient } from "@/lib/supabase/server";

export type ClosureItem = ClosureRow & { memberName: string | null };

/** Le chiusure del salone, divise in programma e passate, con i barbieri per sceglierne uno. */
export async function loadClosures() {
  const { role, salon } = await requireSalon();
  const supabase = await createClient();
  const [closures, members] = await Promise.all([
    supabase.from("closures").select("id, starts_on, ends_on, member_id, note").eq("salon_id", salon.id),
    supabase.from("members").select("id, name").eq("salon_id", salon.id).eq("active", true).order("chair_no"),
  ]);
  const names = new Map((members.data ?? []).map((m) => [m.id, m.name]));
  const rows: ClosureItem[] = (closures.data ?? []).map((c) => ({
    id: c.id,
    startsOn: c.starts_on,
    endsOn: c.ends_on,
    memberId: c.member_id,
    note: c.note,
    memberName: c.member_id ? (names.get(c.member_id) ?? null) : null,
  }));
  const today = romeDate(new Date());
  return {
    canEdit: role === "owner",
    today,
    year: Number(today.slice(0, 4)),
    ...splitClosures(rows, today),
    operators: (members.data ?? []).map((m) => ({ id: m.id, name: m.name })),
  };
}
