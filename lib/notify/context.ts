import "server-only";
import { romeDate, romeMinutes } from "@/lib/dates/rome";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/supabase/env";

export type ApptContext = {
  id: string;
  memberId: string;
  status: string;
  startsAt: Date;
  date: string;
  startMin: number;
  serviceName: string;
  priceCents: number;
  durationMin: number | null;
  memberName: string;
  multiple: boolean;
  clientName: string | null;
  clientEmail: string | null;
  manageUrl: string;
  salon: {
    id: string;
    slug: string;
    name: string;
    phone: string;
    address: string | null;
    cancelOnline: boolean;
    cancelLimitMin: number;
    showPrices: boolean;
    prefs: { confirmation: boolean; reminder: boolean; cancellation: boolean };
  };
};

/** Tutto ciò che serve a scrivere un'email o un avviso su un appuntamento. Solo server: usa la chiave di servizio. */
export async function loadApptContext(id: string): Promise<ApptContext | null> {
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("appointments")
    .select("id, member_id, status, starts_at, service_name, price_cents, service_id, manage_token, salon_id, client:clients(name, email), member:members(name)")
    .eq("id", id)
    .maybeSingle();
  if (!a) return null;
  const [{ data: salon }, { data: prefs }, { data: service }, { count }] = await Promise.all([
    admin.from("salons").select("id, slug, name, phone, address, cancel_online, cancel_limit_min, show_prices").eq("id", a.salon_id).maybeSingle(),
    admin.from("email_prefs").select("confirmation, reminder, cancellation").eq("salon_id", a.salon_id).maybeSingle(),
    a.service_id ? admin.from("services").select("duration_min").eq("id", a.service_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from("members").select("id", { count: "exact", head: true }).eq("salon_id", a.salon_id).eq("active", true),
  ]);
  if (!salon) return null;
  const starts = new Date(a.starts_at);
  return {
    id: a.id,
    memberId: a.member_id,
    status: a.status,
    startsAt: starts,
    date: romeDate(starts),
    startMin: romeMinutes(starts),
    serviceName: a.service_name,
    priceCents: a.price_cents,
    durationMin: service?.duration_min ?? null,
    memberName: a.member?.name ?? "",
    multiple: (count ?? 0) > 1,
    clientName: a.client?.name ?? null,
    clientEmail: a.client?.email ?? null,
    manageUrl: `${env.siteUrl()}/${salon.slug}/prenotazione/${a.manage_token}`,
    salon: {
      id: salon.id,
      slug: salon.slug,
      name: salon.name,
      phone: salon.phone ?? "",
      address: salon.address,
      cancelOnline: salon.cancel_online,
      cancelLimitMin: salon.cancel_limit_min,
      showPrices: salon.show_prices,
      prefs: { confirmation: prefs?.confirmation ?? true, reminder: prefs?.reminder ?? true, cancellation: prefs?.cancellation ?? true },
    },
  };
}

export const footerOf = (s: { name: string; address: string | null; phone: string }) => [s.name, s.address, s.phone].filter(Boolean).join(" · ");
