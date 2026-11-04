import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertsView } from "@/components/settings/AlertsView";
import { requireSalon } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Avvisi per te · Taglendo" };

async function Content() {
  const { id, role, salon } = await requireSalon();
  const supabase = await createClient();
  const [{ data: prefs }, { data: others }] = await Promise.all([
    supabase.from("notification_prefs").select("new_booking, client_cancel, daily_summary, channel, only_mine").eq("member_id", id).maybeSingle(),
    role === "owner" ? supabase.from("members").select("name").eq("salon_id", salon.id).eq("active", true).neq("id", id).order("chair_no") : Promise.resolve({ data: [] as Array<{ name: string }> }),
  ]);
  const names = (others ?? []).map((m) => m.name.split(" ")[0]!);
  const list = names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
  return (
    <AlertsView
      salonName={salon.name}
      isOwner={role === "owner"}
      others={list}
      vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      initial={{
        newBooking: prefs?.new_booking ?? true,
        clientCancel: prefs?.client_cancel ?? true,
        dailySummary: prefs?.daily_summary ?? false,
        channel: (prefs?.channel ?? "push") as "push" | "email" | "both",
        onlyMine: prefs?.only_mine ?? false,
      }}
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
