import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { VerifyForm } from "@/components/auth/VerifyForm";
import { authCopy } from "@/lib/copy/auth";

export const metadata: Metadata = { title: "Verifica la tua email · Taglendo" };

const copy = authCopy.verify;

async function Content() {
  const email = (await cookies()).get("tg_verify_email")?.value;
  if (!email) redirect("/registrati");
  return (
    <AuthShell
      title={copy.title}
      desktopTitle={copy.desktopTitle}
      lead={
        <>
          {copy.sentTo} <strong>{email}</strong>
        </>
      }
      desktopLead={
        <>
          {copy.sentTo} <strong>{email}</strong>.
        </>
      }
      headline={copy.desktopHeadline}
      back={{ href: "/registrati", label: copy.back }}
    >
      <VerifyForm />
    </AuthShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
