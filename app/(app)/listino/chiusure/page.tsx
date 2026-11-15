import type { Metadata } from "next";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { Suspense } from "react";
import { ClosuresView } from "@/components/listino/ClosuresView";
import { loadClosures } from "@/lib/listino/closures";

export const metadata: Metadata = { title: "Ferie e chiusure · Taglendo" };

async function Content({ searchParams }: { searchParams: Promise<{ operatore?: string | string[] }> }) {
  const [data, params] = await Promise.all([loadClosures(), searchParams]);
  const op = Array.isArray(params.operatore) ? params.operatore[0] : params.operatore;
  return <ClosuresView {...data} startFor={op ?? null} />;
}

export default function Page({ searchParams }: { searchParams: Promise<{ operatore?: string | string[] }> }) {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
