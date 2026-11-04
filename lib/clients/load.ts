import "server-only";
import { requireSalon } from "@/lib/auth/session";
import { dayRange, romeDate } from "@/lib/dates/rome";
import { env } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { buildClientRows } from "./rows";

async function permissions(role: "owner" | "barber", salonId: string) {
  const supabase = await createClient();
  if (role === "owner") return { canEdit: true, canSeeContacts: true };
  const { data } = await supabase.from("salons").select("barbers_edit, barbers_contacts").eq("id", salonId).single();
  return { canEdit: data?.barbers_edit ?? false, canSeeContacts: data?.barbers_contacts ?? false };
}

/** La rubrica: tutti i clienti del salone con le loro statistiche, pronti da filtrare nel browser. */
export async function loadClients() {
  const { role, salon } = await requireSalon();
  const supabase = await createClient();
  const today = romeDate(new Date());
  const { start, end } = dayRange(today);

  const [clients, stats, services, members, todayAppts, perms] = await Promise.all([
    supabase.from("clients_visible").select("id, name, phone, email, created_at").eq("salon_id", salon.id).order("name").limit(5000),
    supabase.from("client_stats").select("client_id, visits, last_visit_at, next_at, usual_service_id, usual_member_id").eq("salon_id", salon.id).limit(5000),
    supabase.from("services").select("id, name").eq("salon_id", salon.id),
    supabase.from("members").select("id, name").eq("salon_id", salon.id).eq("active", true),
    supabase.from("appointments").select("client_id").eq("salon_id", salon.id).neq("status", "annullato").gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()),
    permissions(role, salon.id),
  ]);

  const rows = buildClientRows(
    clients.data ?? [],
    stats.data ?? [],
    new Map((services.data ?? []).map((s) => [s.id, s.name])),
    new Map((members.data ?? []).map((m) => [m.id, m.name])),
    new Set((todayAppts.data ?? []).flatMap((a) => (a.client_id ? [a.client_id] : []))),
  );

  return {
    rows,
    today,
    multipleOperators: (members.data ?? []).length > 1,
    bookingUrl: `${env.siteUrl()}/${salon.slug}`,
    salonName: salon.name,
    isOwner: role === "owner",
    ...perms,
  };
}

export type ClientDetail = Awaited<ReturnType<typeof loadClient>>;

/** La scheda di un cliente: anagrafica, nota, prossimo appuntamento, il solito e le ultime visite. Null se non esiste. */
export async function loadClient(id: string) {
  const { role, salon } = await requireSalon();
  const supabase = await createClient();
  const today = romeDate(new Date());

  const [client, stats, services, members, visits, next, perms] = await Promise.all([
    supabase.from("clients_visible").select("id, name, phone, email, created_at, note").eq("id", id).eq("salon_id", salon.id).maybeSingle(),
    supabase.from("client_stats").select("client_id, visits, last_visit_at, next_at, usual_service_id, usual_member_id").eq("client_id", id).maybeSingle(),
    supabase.from("services").select("id, name, duration_min, price_cents").eq("salon_id", salon.id),
    supabase.from("members").select("id, name").eq("salon_id", salon.id).eq("active", true),
    supabase
      .from("appointments")
      .select("id, starts_at, service_name, price_cents, member:members(name)")
      .eq("client_id", id)
      .eq("status", "completato")
      .order("starts_at", { ascending: false })
      .limit(8),
    supabase
      .from("appointments")
      .select("id, starts_at, service_name, member:members(name)")
      .eq("client_id", id)
      .eq("status", "confermato")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
    permissions(role, salon.id),
  ]);
  if (!client.data?.id || !client.data.name) return null;

  const serviceById = new Map((services.data ?? []).map((s) => [s.id, s]));
  const [row] = buildClientRows(
    [client.data],
    stats.data ? [stats.data] : [],
    new Map((services.data ?? []).map((s) => [s.id, s.name])),
    new Map((members.data ?? []).map((m) => [m.id, m.name])),
    new Set(),
  );
  const usual = stats.data?.usual_service_id ? serviceById.get(stats.data.usual_service_id) : undefined;

  return {
    row: row!,
    note: client.data.note ?? "",
    today,
    createdDate: romeDate(new Date(client.data.created_at ?? Date.now())),
    usual: usual ? { id: usual.id, name: usual.name, durationMin: usual.duration_min, priceCents: usual.price_cents } : null,
    usualMemberId: stats.data?.usual_member_id ?? null,
    visits: (visits.data ?? []).map((v) => ({ id: v.id, date: romeDate(new Date(v.starts_at)), service: v.service_name, member: v.member?.name ?? "", priceCents: v.price_cents })),
    next: next.data ? { startsAt: next.data.starts_at, service: next.data.service_name, member: next.data.member?.name ?? "" } : null,
    multipleOperators: (members.data ?? []).length > 1,
    salonName: salon.name,
    isOwner: role === "owner",
    ...perms,
  };
}
