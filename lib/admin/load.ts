import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Overview = {
  salons: number;
  new7: number;
  new30: number;
  trialing: number;
  active: number;
  expired: number;
  suspended: number;
  incomplete: number;
  listed: number;
  hidden: number;
  blocked: number;
  members: number;
  clients: number;
  appointments: { total: number; today: number; d7: number; d30: number; online7: number; online30: number };
  signups: Array<{ day: string; n: number }>;
  bookings: Array<{ day: string; n: number; online: number }>;
};

export type SalonState = "trialing" | "active" | "expired" | "suspended" | "incomplete";

export type SalonRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  created_at: string;
  plan: string;
  sub_status: string;
  trial_ends_at: string;
  onboarding_step: number;
  listed: boolean;
  admin_hidden: boolean;
  suspended_at: string | null;
  owner_name: string | null;
  owner_email: string | null;
  members: number;
  services: number;
  appts: number;
  appts30: number;
  last_activity: string | null;
  state: SalonState;
};

export type SalonDetail = {
  salon: {
    id: string;
    slug: string;
    name: string;
    address: string | null;
    area: string | null;
    city: string | null;
    phone: string;
    description: string | null;
    instagram: string | null;
    plan: string;
    sub_status: string;
    trial_ends_at: string;
    created_at: string;
    onboarding_step: number;
    listed: boolean;
    admin_hidden: boolean;
    suspended_at: string | null;
    suspended_reason: string | null;
    booking_online: boolean;
    lat: number | null;
    lng: number | null;
    timezone: string;
    min_notice_min: number;
    max_advance_days: number;
    slot_step_min: number;
    public: boolean;
  };
  members: Array<{ id: string; name: string; role: "owner" | "barber"; chair_no: number; active: boolean; accepted: boolean; email: string | null; bookable_online: boolean }>;
  services: Array<{ name: string; duration_min: number; price_cents: number; active: boolean }>;
  hours: Array<{ weekday: number; closed: boolean; ranges: Array<[number, number]> }>;
  counts: { clients: number; appointments: number; upcoming: number; last30: number; online: number; online30: number; cancelled: number; no_show: number };
  last_activity: string | null;
  notes: Array<{ id: string; body: string; created_at: string; author: string | null }>;
  audit: Array<{ action: string; details: Record<string, unknown>; created_at: string; admin: string | null }>;
};

export type UserRow = {
  row_id: string;
  name: string;
  role: "owner" | "barber";
  active: boolean;
  user_id: string | null;
  email: string | null;
  salon_id: string | null;
  salon_name: string | null;
  salon_slug: string | null;
  suspended_at: string | null;
  last_sign_in_at: string | null;
  created_at: string | null;
  confirmed: boolean;
  blocked: boolean;
  is_admin: boolean;
  state: "active" | "invited" | "inactive" | "unconfirmed" | "blocked";
};

export type AdminRow = {
  user_id: string;
  email: string;
  name: string | null;
  added_at: string;
  last_sign_in_at: string | null;
  created_at: string | null;
  blocked: boolean;
  self: boolean;
};

export const PAGE_SIZE = 25;
export const USER_FILTERS = ["all", "owner", "barber", "active", "invited", "inactive", "unconfirmed", "blocked"] as const;
export const USER_SORTS = ["access", "name", "salon", "created"] as const;
export type UserFilters = { view: View; q: string; stato: (typeof USER_FILTERS)[number]; sort: (typeof USER_SORTS)[number]; dir: "asc" | "desc"; page: number };
export const STATES = ["all", "trialing", "active", "expired", "suspended", "incomplete", "hidden", "blocked"] as const;
export const SORTS = ["created", "name", "city", "activity", "appointments"] as const;
export type View = "tabella" | "schede";
export type Filters = { view: View; q: string; stato: (typeof STATES)[number]; sort: (typeof SORTS)[number]; dir: "asc" | "desc"; page: number };

export async function loadOverview(): Promise<Overview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview");
  return error ? null : (data as unknown as Overview);
}

export async function loadSalons(f: Filters, limit = PAGE_SIZE): Promise<{ total: number; rows: SalonRow[] } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_salons", { p_q: f.q || undefined, p_status: f.stato, p_sort: f.sort, p_dir: f.dir, p_limit: limit, p_offset: (f.page - 1) * limit });
  return error ? null : (data as unknown as { total: number; rows: SalonRow[] });
}

export async function loadSalon(id: string): Promise<SalonDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_salon", { p_id: id });
  return error || !data ? null : (data as unknown as SalonDetail);
}

type Raw = string | string[] | undefined;
const one = (v: Raw) => (Array.isArray(v) ? v[0] : v) ?? "";

/** I filtri dell'elenco, dall'indirizzo: valori non validi tornano ai predefiniti. */
export function parseFilters(p: { vista?: Raw; q?: Raw; stato?: Raw; ordina?: Raw; dir?: Raw; pagina?: Raw }): Filters {
  const stato = STATES.find((s) => s === one(p.stato)) ?? "all";
  const sort = SORTS.find((s) => s === one(p.ordina)) ?? "created";
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(p.pagina), 10) || 1));
  return { view: one(p.vista) === "tabella" ? "tabella" : "schede", q: one(p.q).trim().slice(0, 80), stato, sort, dir: one(p.dir) === "asc" ? "asc" : "desc", page };
}

/** L'indirizzo dell'elenco con i filtri (per ordinare, filtrare e cambiare pagina). */
export function listHref(f: Filters, change: Partial<Filters> = {}): string {
  const g = { ...f, ...change };
  const q = new URLSearchParams();
  if (g.view === "tabella") q.set("vista", "tabella");
  if (g.q) q.set("q", g.q);
  if (g.stato !== "all") q.set("stato", g.stato);
  if (g.sort !== "created") q.set("ordina", g.sort);
  if (g.dir !== "desc") q.set("dir", g.dir);
  if (g.page > 1) q.set("pagina", String(g.page));
  const s = q.toString();
  return `/admin/saloni${s ? `?${s}` : ""}`;
}

export async function loadUsers(f: UserFilters): Promise<{ total: number; rows: UserRow[] } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_users", { p_q: f.q || undefined, p_status: f.stato, p_sort: f.sort, p_dir: f.dir, p_limit: PAGE_SIZE, p_offset: (f.page - 1) * PAGE_SIZE });
  return error ? null : (data as unknown as { total: number; rows: UserRow[] });
}

export function parseUserFilters(p: { vista?: Raw; q?: Raw; stato?: Raw; ordina?: Raw; dir?: Raw; pagina?: Raw }): UserFilters {
  const stato = USER_FILTERS.find((s) => s === one(p.stato)) ?? "all";
  const sort = USER_SORTS.find((s) => s === one(p.ordina)) ?? "access";
  const page = Math.max(1, Math.min(1000, Number.parseInt(one(p.pagina), 10) || 1));
  return { view: one(p.vista) === "tabella" ? "tabella" : "schede", q: one(p.q).trim().slice(0, 80), stato, sort, dir: one(p.dir) === "asc" ? "asc" : "desc", page };
}

export function userHref(f: UserFilters, change: Partial<UserFilters> = {}): string {
  const g = { ...f, ...change };
  const q = new URLSearchParams();
  if (g.view === "tabella") q.set("vista", "tabella");
  if (g.q) q.set("q", g.q);
  if (g.stato !== "all") q.set("stato", g.stato);
  if (g.sort !== "access") q.set("ordina", g.sort);
  if (g.dir !== "desc") q.set("dir", g.dir);
  if (g.page > 1) q.set("pagina", String(g.page));
  const s = q.toString();
  return `/admin/utenze${s ? `?${s}` : ""}`;
}

export async function loadAdmins(): Promise<AdminRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_admins");
  return error ? null : (data as unknown as AdminRow[]);
}
