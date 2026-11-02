import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { authCopy } from "@/lib/copy/auth";

export const metadata: Metadata = { title: "Nuova password · Taglendo" };

const copy = authCopy.newPassword;

export default function Page() {
  return (
    <AuthShell
      title={copy.title}
      desktopTitle={copy.desktopTitle}
      lead={copy.lead}
      headline={copy.desktopHeadline}
    >
      <NewPasswordForm />
    </AuthShell>
  );
}
