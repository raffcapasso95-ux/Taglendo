import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FloatingAppointment } from "@/components/auth/FloatingAppointment";
import { SignInForm } from "@/components/auth/SignInForm";
import { authCopy } from "@/lib/copy/auth";

export const metadata: Metadata = { title: "Accedi · Taglendo" };

const copy = authCopy.signIn;

export default function Page() {
  return (
    <AuthShell
      title={copy.title}
      lead={copy.lead}
      headline={copy.desktopHeadline}
      decoration={<FloatingAppointment />}
      footer={
        <>
          {copy.noAccount} <Link href="/registrati">{copy.trial}</Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
