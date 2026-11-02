import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Showcase } from "./Showcase";

export const metadata: Metadata = {
  title: "Componenti · Taglendo",
  robots: { index: false, follow: false },
};

/** Catalogo dei componenti base. Solo in sviluppo. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Showcase />;
}
