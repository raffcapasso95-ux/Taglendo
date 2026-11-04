import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EmailPrefsView } from "@/components/settings/EmailPrefsView";
import { requireSalon } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Email ai clienti · Taglendo" };

async function Content() {
  const { role, salon } = await requireSalon();
  if (role !== "owner") redirect("/agenda");
  const supabase = await createClient();
  const { data } = await supabase.from("email_prefs").select("confirmation, reminder, cancellation").eq("salon_id", salon.id).maybeSingle();
  return <EmailPrefsView initial={{ confirmation: data?.confirmation ?? true, reminder: data?.reminder ?? true, cancellation: data?.cancellation ?? true }} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
