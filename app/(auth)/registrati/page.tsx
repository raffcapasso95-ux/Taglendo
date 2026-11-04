import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { authCopy } from "@/lib/copy/auth";
import { isEmail } from "@/lib/rules/forms";

export const metadata: Metadata = { title: "Registra il tuo salone · Taglendo" };

const copy = authCopy.signUp;

/** L'email scritta nel sito commerciale arriva qui già compilata. */
async function Form({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const value = typeof email === "string" && isEmail(email.trim()) ? email.trim() : "";
  return <SignUpForm defaultEmail={value} />;
}

export default function Page(props: PageProps<"/registrati">) {
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
      <Suspense fallback={<SignUpForm />}>
        <Form searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}
