import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormAlert } from "@/components/auth/FormAlert";
import { InviteForm } from "@/components/auth/InviteForm";
import { ButtonLink } from "@/components/ui";
import { authCopy } from "@/lib/copy/auth";
import { findInvite } from "@/lib/operators/accept";

export const metadata: Metadata = { title: "Invito · Taglendo", robots: { index: false, follow: false } };

const copy = authCopy.invite;

async function Content({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const invite = await findInvite(token);

  if (!invite) {
    return (
      <AuthShell title={authCopy.signIn.title} lead={authCopy.errors.inviteInvalid} headline={authCopy.signIn.desktopHeadline}>
        <FormAlert>{authCopy.errors.inviteInvalid}</FormAlert>
        <ButtonLink href="/accedi" size="large" fullWidth>
          {authCopy.signIn.submit}
        </ButtonLink>
      </AuthShell>
    );
  }

  const owner = invite.ownerName.split(/\s+/)[0] ?? "";
  return (
    <AuthShell
      title={copy.title(owner)}
      lead={
        <>
          {copy.lead} <strong>{invite.salonName}</strong>.
        </>
      }
      desktopTitle={copy.desktopTitle}
      desktopLead={copy.desktopLead(owner)}
      headline={copy.desktopHeadline(owner, invite.salonName)}
      footer={copy.note(owner)}
      footerDesktopOnly={false}
    >
      <InviteForm token={token} name={invite.memberName} email={invite.email} />
    </AuthShell>
  );
}

export default function Page(props: PageProps<"/invito/[token]">) {
  return (
    <Suspense fallback={null}>
      <Content params={props.params} />
    </Suspense>
  );
}
