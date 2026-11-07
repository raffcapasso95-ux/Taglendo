import type { Metadata } from "next";
import { Suspense } from "react";
import { StatsView } from "@/components/stats/StatsView";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { loadStats } from "@/lib/stats/load";

export const metadata: Metadata = { title: "Statistiche · Taglendo" };

async function Content({ params }: { params: Promise<{ periodo?: string; data?: string }> }) {
  const model = await loadStats(await params);
  return <StatsView m={model} />;
}

export default function Page({ searchParams }: { searchParams: Promise<{ periodo?: string; data?: string }> }) {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Content params={searchParams} />
    </Suspense>
  );
}
