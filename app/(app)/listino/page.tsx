import type { Metadata } from "next";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { Suspense } from "react";
import { ListinoView } from "@/components/listino/ListinoView";
import { requireSalon } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Listino e orari · Taglendo" };

async function Content() {
  const { role, salon } = await requireSalon();
  const supabase = await createClient();
  const [services, members] = await Promise.all([
    supabase.from("services").select("id, name, duration_min, price_cents").eq("salon_id", salon.id).eq("active", true).order("sort"),
    supabase.from("members").select("name, role").eq("salon_id", salon.id).eq("active", true),
  ]);
  const owner = (members.data ?? []).find((m) => m.role === "owner")?.name ?? "";

  return (
    <ListinoView
      canEdit={role === "owner"}
      ownerName={owner}
      services={(services.data ?? []).map((s) => ({ id: s.id, name: s.name, durationMin: s.duration_min, priceCents: s.price_cents }))}
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
