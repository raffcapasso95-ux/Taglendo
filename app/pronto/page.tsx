import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Done } from "@/components/onboarding/Done";
import { requireSalon } from "@/lib/auth/session";
import { billingEnabled } from "@/lib/billing";
import { formatDayMonth } from "@/lib/dates/format";
import { env } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Tutto pronto · Taglendo" };

async function Content() {
  const { salon } = await requireSalon({ allowOnboarding: true });
  if (salon.onboarding_step < 5) redirect(`/primo-avvio/${salon.onboarding_step}`);

  const url = `${env.siteUrl()}/${salon.slug}`;
  return (
    <Done
      salonName={salon.name}
      url={url}
      display={url.replace(/^https?:\/\//, "")}
      trialEnds={billingEnabled() ? formatDayMonth(new Date(salon.trial_ends_at)) : undefined}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
