import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivityView } from "@/components/activity/ActivityView";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { loadActivity } from "@/lib/activity/load";

export const metadata: Metadata = { title: "Notifiche · Taglendo" };

async function Content() {
  const data = await loadActivity();
  return <ActivityView {...data} />;
}

export default function Page() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Content />
    </Suspense>
  );
}
