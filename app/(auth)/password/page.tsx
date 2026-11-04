import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/ForgotForm";
import { authCopy } from "@/lib/copy/auth";

export const metadata: Metadata = { title: "Password dimenticata · Taglendo" };

const copy = authCopy.forgot;

export default function Page() {
  return (
    <AuthShell
      title={copy.title}
      desktopTitle={copy.desktopTitle}
      lead={copy.lead}
      headline={copy.desktopHeadline}
      back={{ href: "/accedi", label: copy.back }}
      desktopBack
    >
      <Suspense fallback={null}>
        <ForgotForm />
      </Suspense>
    </AuthShell>
  );
}
