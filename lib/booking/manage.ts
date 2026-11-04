import "server-only";
import { romeDate, romeMinutes } from "@/lib/dates/rome";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DayHours } from "@/lib/rules/hours";

export type ManageData = {
  status: "confermato" | "completato" | "annullato" | "non_presentato";
  startsAt: string;
  endsAt: string;
  date: string;
  startMin: number;
  publicCode: string;
  serviceName: string;
  durationMin: number | null;
  priceCents: number;
  memberName: string | null;
  multiple: boolean;
  salon: {
    slug: string;
    name: string;
    address: string | null;
    area: string | null;
    phone: string;
    cancelOnline: boolean;
    cancelLimitMin: number;
    showPrices: boolean;
    week: DayHours[];
  };
};

type Raw = {
  status: ManageData["status"]; starts_at: string; ends_at: string; public_code: string; service_name: string; duration_min: number | null;
  price_cents: number; member_name: string | null; member_count: number;
  salon: {
    slug: string; name: string; address: string | null; area: string | null; phone: string; cancel_online: boolean; cancel_limit_min: number; show_prices: boolean;
    hours: Array<{ weekday: number; closed: boolean; open_min: number | null; close_min: number | null; break_start_min: number | null; break_end_min: number | null }>;
  };
};

const CLOSED: DayHours = { closed: true, openMin: null, closeMin: null, breakStartMin: null, breakEndMin: null };

/** La prenotazione di questo link, o null se il link non esiste. Non controlla ancora se è ancora valida. */
export async function loadManage(token: string): Promise<ManageData | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const { data, error } = await createAdminClient().rpc("booking_by_token", { p_token: token });
  if (error || !data) return null;
  const r = data as unknown as Raw;
  const starts = new Date(r.starts_at);
  return {
    status: r.status,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    date: romeDate(starts),
    startMin: romeMinutes(starts),
    publicCode: r.public_code,
    serviceName: r.service_name,
    durationMin: r.duration_min,
    priceCents: r.price_cents,
    memberName: r.member_name,
    multiple: r.member_count > 1,
    salon: {
      slug: r.salon.slug,
      name: r.salon.name,
      address: r.salon.address,
      area: r.salon.area,
      phone: r.salon.phone,
      cancelOnline: r.salon.cancel_online,
      cancelLimitMin: r.salon.cancel_limit_min,
      showPrices: r.salon.show_prices,
      week: Array.from({ length: 7 }, (_, d) => {
        const h = r.salon.hours.find((x) => x.weekday === d);
        return h ? { closed: h.closed, openMin: h.open_min, closeMin: h.close_min, breakStartMin: h.break_start_min, breakEndMin: h.break_end_min } : CLOSED;
      }),
    },
  };
}
