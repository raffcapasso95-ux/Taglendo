import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Utente della sessione, verificato con Supabase (non solo letto dal cookie). */
export const getUser = cache(async () => {
  // La sessione si verifica a ogni richiesta, mai nella bozza pre-caricata della pagina:
  // il client Supabase legge l'orologio, e lì Next non lo permette.
  await connection();
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
  "id, slug, name, address, area, phone, description, onboarding_step, trial_ends_at, plan, sub_status, booking_online, cancel_online, show_prices, cancel_limit_min";

async function fetchMembership(userId: string, salonId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("members")
    .select(`id, name, role, chair_no, salon:salons!inner(${SALON_COLUMNS})`)
    .eq("user_id", userId)
    .eq("active", true);
  // Next unisce due richieste GET identiche nello stesso render: dopo aver creato il salone
  // il filtro per salone rende la richiesta diversa, così non riceve la risposta vuota di prima.
  if (salonId) query = query.eq("salon_id", salonId);
  const { data } = await query.order("role", { ascending: true }).limit(1).maybeSingle(); // 'owner' prima di 'barber'
  return data;
}

/** Il salone dell'utente e il suo posto al suo interno. Il titolare ha la precedenza. */
export const getMembership = cache(async () => {
  const user = await getUser();
  return user ? fetchMembership(user.id) : null;
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
    const { data: salonId, error } = await supabase.rpc("register_salon");
    if (error || !salonId) redirect("/accedi");
    membership = await fetchMembership(user.id, salonId);
  }
  if (!membership) redirect("/accedi");

  const step = membership.salon.onboarding_step;
  if (step < 5 && !options.allowOnboarding && membership.role === "owner") {
    redirect(`/primo-avvio/${step}`);
  }
  return membership;
}
