import type { Metadata, Viewport } from "next";
import { PublicSkeleton } from "@/components/states/Skeletons";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicPage } from "@/components/salon/PublicPage";
import { hasActiveAccess } from "@/lib/billing";
import { ONLINE_BOOKING_READY } from "@/lib/features";
import { loadPublicSalon } from "@/lib/public/load";
import { romeMinutes, weekdayOf, romeDate } from "@/lib/dates/rome";

export const viewport: Viewport = { themeColor: "#3E2532" };

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const salon = await loadPublicSalon(slug);
  if (!salon) return { title: "Pagina non trovata · Taglendo" };
  const where = salon.area?.split("·").pop()?.trim();
  return {
    title: where ? `${salon.name} — ${where}` : salon.name,
    description: salon.description ?? `Orari, servizi e telefono di ${salon.name}.`,
  };
}

async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await loadPublicSalon(slug);
  if (!salon) notFound();
  await connection(); // il cartello Aperto/Chiuso dipende dall'ora
  const now = new Date();
  const today = romeDate(now);
  const bookingOn = ONLINE_BOOKING_READY && salon.bookingOnline && hasActiveAccess(salon.access) && salon.services.length > 0;
  return <PublicPage salon={salon} weekday={weekdayOf(today)} nowMin={romeMinutes(now)} today={today} bookingOn={bookingOn} />;
}

export default function Page(props: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<PublicSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}
