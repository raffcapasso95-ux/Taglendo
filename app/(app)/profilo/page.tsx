import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileView } from "@/components/profile/ProfileView";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { requireSalon } from "@/lib/auth/session";
import { loadWeek } from "@/lib/hours/week";
import { profileStats } from "@/lib/profile/load";
import { agoText } from "@/lib/rules/profile";
import { dayFromRanges } from "@/lib/rules/hours";
import { shortHours } from "@/lib/rules/publicPage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profilo · Taglendo" };

const since = (iso: string) => {
  const text = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", month: "long", year: "numeric" }).format(new Date(iso));
  return text;
};

async function Content() {
  const { id, name, role, chair_no: chair, salon } = await requireSalon();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user!;
  const changed = (user.user_metadata?.password_changed_at as string | undefined) ?? user.created_at;

  const [{ data: me }, week, stats] = await Promise.all([
    supabase.from("members").select("phone, agenda_color, bookable_online, photo_path").eq("id", id).single(),
    loadWeek(supabase, salon.id),
    profileStats(id),
  ]);
  let photoUrl: string | null = null;
  if (me?.photo_path) {
    const signed = await supabase.storage.from("member-photos").createSignedUrl(me.photo_path, 3600);
    photoUrl = signed.data?.signedUrl ?? null;
  }
  const days = shortHours(week.map(dayFromRanges)).split(" · ")[0] ?? "";

  return (
    <ProfileView
      name={name}
      email={user.email ?? ""}
      phone={me?.phone ?? ""}
      color={me?.agenda_color ?? Math.max(0, chair - 1) % 4}
      bookable={me?.bookable_online ?? true}
      photoUrl={photoUrl}
      passwordAgo={agoText(new Date(changed), new Date())}
      isOwner={role === "owner"}
      salonName={salon.name}
      chair={chair}
      hoursDays={days}
      since={since(user.created_at)}
      stats={stats}
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
