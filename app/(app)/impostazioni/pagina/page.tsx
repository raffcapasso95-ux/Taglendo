import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SalonPageView } from "@/components/page/SalonPageView";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { requireSalon } from "@/lib/auth/session";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pagina del salone · Taglendo" };

async function Content() {
  const { role, salon } = await requireSalon();
  if (role !== "owner") redirect("/impostazioni");
  const supabase = await createClient();
  const [{ data: row }, { data: photos }] = await Promise.all([
    supabase.from("salons").select("name, area, description, phone, address, slug, booking_online, show_prices").eq("id", salon.id).single(),
    supabase.from("salon_photos").select("id, path").eq("salon_id", salon.id).order("sort").order("created_at"),
  ]);
  const publicUrl = (path: string) => supabase.storage.from("salon-photos").getPublicUrl(path).data.publicUrl;
  return (
    <SalonPageView
      host={siteUrl().replace(/^https?:\/\//, "")}
      slug={row?.slug ?? salon.slug}
      initial={{
        name: row?.name ?? "",
        area: row?.area ?? "",
        description: row?.description ?? "",
        phone: row?.phone ?? "",
        address: row?.address ?? "",
        bookingOnline: row?.booking_online ?? true,
        showPrices: row?.show_prices ?? true,
      }}
      photos={(photos ?? []).map((p) => ({ id: p.id, url: publicUrl(p.path) }))}
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
