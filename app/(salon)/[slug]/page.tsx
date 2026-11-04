import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicPage } from "@/components/salon/PublicPage";
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
  return <PublicPage salon={salon} weekday={weekdayOf(romeDate(now))} nowMin={romeMinutes(now)} />;
}

export default function Page(props: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Content params={props.params} />
    </Suspense>
  );
}
