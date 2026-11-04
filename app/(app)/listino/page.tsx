import type { Metadata } from "next";
import { Suspense } from "react";
import { ListinoView } from "@/components/listino/ListinoView";
import { requireSalon } from "@/lib/auth/session";
import type { HoursDraft } from "@/lib/rules/listino";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Listino e orari · Taglendo" };

async function Content() {
  const { role, salon } = await requireSalon();
  const supabase = await createClient();
  const [services, hours, members] = await Promise.all([
    supabase.from("services").select("id, name, duration_min, price_cents").eq("salon_id", salon.id).eq("active", true).order("sort"),
    supabase.from("opening_hours").select("weekday, closed, open_min, close_min, break_start_min, break_end_min").eq("salon_id", salon.id),
    supabase.from("members").select("name, role, chair_no").eq("salon_id", salon.id).eq("active", true).order("chair_no"),
  ]);

  const rows = hours.data ?? [];
  const openRow = rows.find((r) => !r.closed && r.open_min != null && r.close_min != null);
  const draft: HoursDraft = {
    closedDays: rows.filter((r) => r.closed).map((r) => r.weekday),
    open: openRow?.open_min ?? 540,
    close: openRow?.close_min ?? 1140,
    breakStart: openRow?.break_start_min ?? -1,
    breakEnd: openRow?.break_end_min ?? -1,
  };
  const people = members.data ?? [];
  const owner = people.find((m) => m.role === "owner")?.name ?? "";

  return (
    <ListinoView
      canEdit={role === "owner"}
      ownerName={owner}
      services={(services.data ?? []).map((s) => ({ id: s.id, name: s.name, durationMin: s.duration_min, priceCents: s.price_cents }))}
      hours={draft}
      operatorNames={people.map((m) => m.name).join(", ")}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
