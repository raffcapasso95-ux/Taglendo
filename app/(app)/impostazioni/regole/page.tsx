import type { Metadata } from "next";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RulesView } from "@/components/settings/RulesView";
import { requireSalon } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Rules } from "@/lib/settings/actions";

export const metadata: Metadata = { title: "Prenotazioni dei clienti · Taglendo" };

async function Content() {
  const { role, salon } = await requireSalon();
  if (role !== "owner") redirect("/agenda"); // le regole le cambia il titolare
  const supabase = await createClient();
  const { data } = await supabase
    .from("salons")
    .select("booking_online, cancel_online, show_prices, min_notice_min, max_advance_days, slot_step_min, cancel_limit_min")
    .eq("id", salon.id)
    .single();
  if (!data) redirect("/agenda");
  const initial: Rules = {
    bookingOnline: data.booking_online,
    cancelOnline: data.cancel_online,
    showPrices: data.show_prices,
    minNoticeMin: data.min_notice_min as Rules["minNoticeMin"],
    maxAdvanceDays: data.max_advance_days as Rules["maxAdvanceDays"],
    slotStepMin: data.slot_step_min as Rules["slotStepMin"],
    cancelLimitMin: data.cancel_limit_min as Rules["cancelLimitMin"],
  };
  return <RulesView initial={initial} />;
}

export default function Page() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Content />
    </Suspense>
  );
}
