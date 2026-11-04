import "server-only";
import { hasActiveAccess } from "@/lib/billing";
import { romeDate, romeMinutes } from "@/lib/dates/rome";
import { ONLINE_BOOKING_READY } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";

export type BookingSalon = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string;
  cancelOnline: boolean;
  cancelLimitMin: number;
  showPrices: boolean;
  members: Array<{ id: string; name: string }>;
};

/** Il salone con questo link, se si può prenotare online adesso: attivo, prenotazioni accese, accesso valido. */
export async function loadBookingSalon(slug: string): Promise<BookingSalon | null> {
  if (!ONLINE_BOOKING_READY || !/^[a-z0-9]+(-[a-z0-9]+)*$/i.test(slug)) return null;
  const admin = createAdminClient();
  const { data: s } = await admin
    .from("salons")
    .select("id, slug, name, address, phone, booking_online, cancel_online, cancel_limit_min, show_prices, sub_status, trial_ends_at")
    .eq("slug", slug.toLowerCase())
    .is("deleted_at", null)
    .maybeSingle();
  if (!s || !s.booking_online || !hasActiveAccess(s)) return null;
  const { data: members } = await admin.from("members").select("id, name").eq("salon_id", s.id).eq("active", true).order("chair_no");
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    address: s.address,
    phone: s.phone ?? "",
    cancelOnline: s.cancel_online,
    cancelLimitMin: s.cancel_limit_min,
    showPrices: s.show_prices,
    members: members ?? [],
  };
}

export type FreeRow = { memberId: string; date: string; startMin: number; startsAt: string };

/** Gli orari liberi per il pubblico (passo, preavviso e anticipo del salone), da `free_slots`. */
export async function freePublicRows(salonId: string, serviceId: string, memberId: string | null, from: string, days: number): Promise<FreeRow[]> {
  const { data } = await createAdminClient().rpc("free_slots", {
    p_salon: salonId,
    p_service: serviceId,
    // Il tipo generato non ammette null, ma la funzione sì: null = tutti i barbieri.
    p_member: memberId as string,
    p_from: from,
    p_days: days,
    p_public: true,
  });
  return (data ?? []).map((r) => ({ memberId: r.member_id, date: romeDate(new Date(r.starts_at)), startMin: romeMinutes(new Date(r.starts_at)), startsAt: r.starts_at }));
}
