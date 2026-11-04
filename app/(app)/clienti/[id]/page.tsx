import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClientDetail } from "@/components/clients/ClientDetail";
import { loadClient } from "@/lib/clients/load";

export const metadata: Metadata = { title: "Cliente · Taglendo" };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = /^[0-9a-f-]{36}$/i.test(id) ? await loadClient(id) : null;
  if (!data) notFound();
  return <ClientDetail {...data} />;
}

export default function Page(props: PageProps<"/clienti/[id]">) {
  return (
    <Suspense fallback={null}>
      <Content params={props.params} />
    </Suspense>
  );
}
