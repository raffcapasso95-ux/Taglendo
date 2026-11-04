import type { Metadata } from "next";
import { ListSkeleton } from "@/components/states/Skeletons";
import { Suspense } from "react";
import { ClientsView } from "@/components/clients/ClientsView";
import { loadClients } from "@/lib/clients/load";

export const metadata: Metadata = { title: "Clienti · Taglendo" };

async function Content() {
  const data = await loadClients();
  return <ClientsView {...data} />;
}

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Content />
    </Suspense>
  );
}
