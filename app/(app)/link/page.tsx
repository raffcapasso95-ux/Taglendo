import type { Metadata } from "next";
import { Suspense } from "react";
import { LinkView } from "@/components/link/LinkView";
import { requireSalon } from "@/lib/auth/session";
import { ONLINE_BOOKING_READY } from "@/lib/features";
import { env } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Link · Taglendo" };

async function Content() {
  const { role, salon } = await requireSalon();
  return (
    <LinkView
      salonName={salon.name}
      url={`${env.siteUrl()}/${salon.slug}`}
      prices={salon.show_prices}
      bookingOnline={ONLINE_BOOKING_READY && salon.booking_online}
      cancelLabel={salon.cancel_online ? (salon.cancel_limit_min >= 1440 ? "Fino a 24 ore prima" : "Fino a 2 ore prima") : "Solo telefono"}
      isOwner={role === "owner"}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
