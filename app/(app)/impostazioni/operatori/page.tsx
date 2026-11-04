import type { Metadata } from "next";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OperatorsView, type OperatorRow } from "@/components/operators/OperatorsView";
import { requireSalon } from "@/lib/auth/session";
import { inviteStatus } from "@/lib/rules/invite";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Operatori · Taglendo" };

async function Content() {
  const { id: myMemberId, role, salon } = await requireSalon();
  // Ai barbieri le impostazioni del salone le cambia il titolare.
  if (role !== "owner") redirect("/agenda");

  const supabase = await createClient();
  const [{ data: members }, { data: full }] = await Promise.all([
    supabase
      .from("members")
      .select("id, name, role, chair_no, user_id, invite_email, invite_expires_at, active")
      .eq("salon_id", salon.id)
      .eq("active", true)
      .order("chair_no"),
    supabase.from("salons").select("barbers_see_all, barbers_edit, barbers_contacts").eq("id", salon.id).single(),
  ]);

  const rows = members ?? [];
  const people: OperatorRow[] = rows.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    chairNo: m.chair_no,
    accepted: m.user_id !== null,
    isMe: m.id === myMemberId,
    email: m.invite_email,
    invite: inviteStatus(m.invite_expires_at),
  }));

  return (
    <OperatorsView
      salonName={salon.name}
      people={people}
      canAdd={rows.length < 3}
      permissions={{
        seeAll: full?.barbers_see_all ?? true,
        edit: full?.barbers_edit ?? true,
        contacts: full?.barbers_contacts ?? false,
      }}
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
