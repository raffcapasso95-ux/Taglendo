import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { authCopy } from "@/lib/copy/auth";

export const metadata: Metadata = { title: "Registra il tuo salone · Taglendo" };

const copy = authCopy.signUp;

export default function Page() {
  return (
    <AuthShell
      title={copy.title}
      lead={copy.lead}
      headline={copy.desktopHeadline}
      chips={copy.chips}
      back={{ href: "/accedi", label: copy.back }}
      footer={
        <>
          {copy.haveAccount} <Link href="/accedi">{copy.signIn}</Link>
        </>
      }
      footerDesktopOnly
    >
      <SignUpForm />
    </AuthShell>
  );
}
