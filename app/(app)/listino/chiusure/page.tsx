import type { Metadata } from "next";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { Suspense } from "react";
import { ClosuresView } from "@/components/listino/ClosuresView";
import { loadClosures } from "@/lib/listino/closures";

export const metadata: Metadata = { title: "Ferie e chiusure · Taglendo" };

async function Content() {
  const data = await loadClosures();
  return <ClosuresView {...data} />;
}

export default function Page() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Content />
    </Suspense>
  );
}
