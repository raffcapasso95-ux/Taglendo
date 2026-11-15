import type { Metadata } from "next";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { Suspense } from "react";
import { OrariView } from "@/components/listino/OrariView";
import { requireSalon } from "@/lib/auth/session";
import { romeDate, weekdayOf } from "@/lib/dates/rome";
import { loadMemberWeeks, loadWeek } from "@/lib/hours/week";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Orari · Taglendo" };

async function Content() {
  const { role, salon } = await requireSalon();
  const supabase = await createClient();
  const [week, memberWeeks, members] = await Promise.all([
    loadWeek(supabase, salon.id),
    loadMemberWeeks(supabase, salon.id),
    supabase.from("members").select("id, name, role, chair_no").eq("salon_id", salon.id).eq("active", true).order("chair_no"),
  ]);
  const people = members.data ?? [];

  return (
    <OrariView
      canEdit={role === "owner"}
      ownerName={people.find((m) => m.role === "owner")?.name ?? ""}
      week={week}
      todayWeekday={weekdayOf(romeDate(new Date()))}
      operatorNames={people.map((m) => m.name).join(", ")}
      team={people.map((m) => ({ id: m.id, name: m.name, week: memberWeeks[m.id] ?? null }))}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Content />
    </Suspense>
  );
}
