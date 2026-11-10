import type { Metadata } from "next";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EmailPrefsView } from "@/components/settings/EmailPrefsView";
import { requireSalon } from "@/lib/auth/session";
import { DEFAULT_REMINDER_HOURS, isReminderHours } from "@/lib/rules/reminders";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Email ai clienti · Taglendo" };

async function Content() {
  const { role, salon } = await requireSalon();
  if (role !== "owner") redirect("/agenda");
  const supabase = await createClient();
  const { data } = await supabase.from("email_prefs").select("confirmation, reminder, reminder_hours, cancellation").eq("salon_id", salon.id).maybeSingle();
  return <EmailPrefsView initial={{ confirmation: data?.confirmation ?? true, reminder: data?.reminder ?? true, reminderHours: isReminderHours(data?.reminder_hours) ? data.reminder_hours : DEFAULT_REMINDER_HOURS, cancellation: data?.cancellation ?? true }} />;
}

export default function Page() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Content />
    </Suspense>
  );
}
