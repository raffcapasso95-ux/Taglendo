import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Utente della sessione, verificato con Supabase (non solo letto dal cookie). */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/accedi");
  return user;
}

const SALON_COLUMNS =
  "id, slug, name, address, area, phone, description, onboarding_step, trial_ends_at, plan, sub_status, booking_online, cancel_online, show_prices";

/** Il salone dell'utente e il suo posto al suo interno. Il titolare ha la precedenza. */
export const getMembership = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select(`id, name, role, chair_no, salon:salons!inner(${SALON_COLUMNS})`)
    .eq("user_id", user.id)
    .eq("active", true)
    .order("role", { ascending: true }) // 'owner' viene prima di 'barber'
    .limit(1)
    .maybeSingle();
  return data;
});

export type Membership = NonNullable<Awaited<ReturnType<typeof getMembership>>>;

/**
 * Per le pagine del gestionale: serve un utente con un salone che ha finito il
 * primo avvio. Chi non l'ha finito torna al passo giusto.
 * `allowOnboarding` serve alle pagine del primo avvio stesso.
 */
export async function requireSalon(options: { allowOnboarding?: boolean } = {}): Promise<Membership> {
  const user = await requireUser();
  let membership = await getMembership();

  if (!membership) {
    // Utente verificato senza salone (es. registrazione interrotta): lo crea ora. È idempotente.
    const supabase = await createClient();
    await supabase.rpc("register_salon");
    membership = await getMembershipUncached(user.id);
  }
  if (!membership) redirect("/accedi");

  const step = membership.salon.onboarding_step;
  if (step < 5 && !options.allowOnboarding && membership.role === "owner") {
    redirect(`/primo-avvio/${step}`);
  }
  return membership;
}

async function getMembershipUncached(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select(`id, name, role, chair_no, salon:salons!inner(${SALON_COLUMNS})`)
    .eq("user_id", userId)
    .eq("active", true)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}
