import { salonLogoUrl } from "@/lib/salon/logo";
import "server-only";
import { cache } from "react";
import { createAnonClient } from "@/lib/supabase/anon";
import { env } from "@/lib/supabase/env";
import type { AccessInput } from "@/lib/billing";
import { CLOSED_DAY, dayFromRanges, type DayHours } from "@/lib/rules/hours";

type PublicService = { id: string; name: string; durationMin: number; priceCents: number };
type PublicMember = { id: string; name: string; bio: string | null; photoPath: string | null; chairNo: number };

export type PublicSalon = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  area: string | null;
  phone: string;
  description: string | null;
  instagram: string | null;
  coverPath: string | null;
  /** NUOVO: indirizzo del logo, o null. */
  logoUrl: string | null;
  bookingOnline: boolean;
  cancelOnline: boolean;
  showPrices: boolean;
  cancelLimitMin: number;
  minNoticeMin: number;
  maxAdvanceDays: number;
  access: AccessInput;
  services: PublicService[];
  members: PublicMember[];
  /** Indirizzi delle foto del salone (la prima è la copertina). */
  photos: string[];
  week: DayHours[];
};

type Raw = {
  id: string; slug: string; name: string; address: string | null; area: string | null; phone: string;
  description: string | null; instagram: string | null; cover_path: string | null; logo_path?: string | null;
  booking_online: boolean; cancel_online: boolean; show_prices: boolean; cancel_limit_min: number;
  min_notice_min: number; max_advance_days: number; sub_status: AccessInput["sub_status"]; trial_ends_at: string;
  services: Array<{ id: string; name: string; duration_min: number; price_cents: number }>;
  members: Array<{ id: string; name: string; bio: string | null; photo_path: string | null; chair_no: number }>;
  photos?: string[];
  hours: Array<{ weekday: number; closed: boolean; ranges: Array<[number, number]> }>;
};

const CLOSED: DayHours = CLOSED_DAY;

/** Il salone con questo link, o null se non c'è (o è stato eliminato). */
export const loadPublicSalon = cache(async (slug: string): Promise<PublicSalon | null> => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/i.test(slug) || slug.length > 60) return null;
  const { data, error } = await createAnonClient().rpc("public_salon", { p_slug: slug });
  if (error || !data) return null;
  const r = data as unknown as Raw;
  const week: DayHours[] = Array.from({ length: 7 }, (_, d) => {
    const h = r.hours.find((x) => x.weekday === d);
    return h ? dayFromRanges({ closed: h.closed, ranges: h.ranges }) : CLOSED;
  });
  return {
    id: r.id, slug: r.slug, name: r.name, address: r.address, area: r.area, phone: r.phone, description: r.description,
    instagram: r.instagram, coverPath: r.cover_path, logoUrl: salonLogoUrl(r.logo_path), bookingOnline: r.booking_online, cancelOnline: r.cancel_online,
    showPrices: r.show_prices, cancelLimitMin: r.cancel_limit_min, minNoticeMin: r.min_notice_min, maxAdvanceDays: r.max_advance_days,
    access: { sub_status: r.sub_status, trial_ends_at: r.trial_ends_at },
    services: r.services.map((s) => ({ id: s.id, name: s.name, durationMin: s.duration_min, priceCents: s.price_cents })),
    members: r.members.map((m) => ({ id: m.id, name: m.name, bio: m.bio, photoPath: m.photo_path, chairNo: m.chair_no })),
    photos: (r.photos ?? []).map((path) => `${env.url()}/storage/v1/object/public/salon-photos/${path}`),
    week,
  };
});
