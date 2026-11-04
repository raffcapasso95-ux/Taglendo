import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileView } from "@/components/profile/ProfileView";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { requireSalon } from "@/lib/auth/session";
import { agoText } from "@/lib/rules/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profilo · Taglendo" };

async function Content() {
  const { name, role, salon } = await requireSalon();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user!;
  const changed = (user.user_metadata?.password_changed_at as string | undefined) ?? user.created_at;
  return <ProfileView name={name} email={user.email ?? ""} passwordAgo={agoText(new Date(changed), new Date())} isOwner={role === "owner"} salonName={salon.name} />;
}

export default function Page() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Content />
    </Suspense>
  );
}
