import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { StepChairs } from "@/components/onboarding/StepChairs";
import { StepHours, type HoursInitial } from "@/components/onboarding/StepHours";
import { PRESET_SERVICES, StepServices, type ServiceDraft } from "@/components/onboarding/StepServices";
import { StepSalon } from "@/components/onboarding/StepSalon";
import { requireSalon } from "@/lib/auth/session";
import { loadWeek } from "@/lib/hours/week";
import { dayFromRanges, formatMinutes } from "@/lib/rules/hours";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Primo avvio · Taglendo" };

/** Il link provvisorio dato alla registrazione: finché è ancora così, il nome non è stato scelto. */
const PROVISIONAL_SLUG = /^salone-[0-9a-f]{8}$/;

async function Content({ params }: { params: Promise<{ step: string }> }) {
  const step = Number((await params).step);
  if (![1, 2, 3, 4].includes(step)) notFound();

  const { role, name: ownerName, salon } = await requireSalon({ allowOnboarding: true });
  if (role !== "owner" || salon.onboarding_step >= 5) redirect("/agenda");
  // Non si salta avanti: ogni passo si apre solo dopo aver salvato i precedenti.
  if (step > salon.onboarding_step) redirect(`/primo-avvio/${salon.onboarding_step}`);

  const doneUpTo = salon.onboarding_step;
  const preview = { name: salon.name, address: salon.address ?? "", phone: salon.phone ?? "" };
  const supabase = await createClient();

  if (step === 1) {
    const fresh = PROVISIONAL_SLUG.test(salon.slug);
    return (
      <StepSalon
        doneUpTo={doneUpTo}
        initial={{
          name: fresh ? "" : salon.name,
          address: salon.address ?? "",
          phone: salon.phone ?? "",
          slug: salon.slug,
          slugAuto: fresh,
        }}
      />
    );
  }

  if (step === 2) {
    const week = (await loadWeek(supabase, salon.id)).map(dayFromRanges);
    const openDays = week.map((d, weekday) => ({ d, weekday })).filter(({ d }) => !d.closed);
    const ref = openDays[0]?.d;
    const firstBreak = ref?.breaks[0];
    const initial: HoursInitial = {
      days: openDays.map(({ weekday }) => weekday),
      open: formatMinutes(ref?.openMin ?? 540),
      close: formatMinutes(ref?.closeMin ?? 1140),
      breakOn: ref ? firstBreak != null : true,
      breakStart: formatMinutes(firstBreak?.[0] ?? 780),
      breakEnd: formatMinutes(firstBreak?.[1] ?? 870),
    };
    return <StepHours doneUpTo={doneUpTo} salon={preview} initial={initial} />;
  }

  if (step === 3) {
    const { data } = await supabase.from("services").select("*").eq("salon_id", salon.id).order("sort");
    const saved: ServiceDraft[] = (data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      duration: String(s.duration_min),
      price: String(s.price_cents / 100).replace(".", ","),
      enabled: true,
    }));
    return <StepServices doneUpTo={doneUpTo} salon={preview} initial={saved.length > 0 ? saved : PRESET_SERVICES} />;
  }

  const { data } = await supabase
    .from("members")
    .select("name, chair_no")
    .eq("salon_id", salon.id)
    .eq("role", "barber")
    .order("chair_no");
  return <StepChairs doneUpTo={doneUpTo} salon={preview} ownerName={ownerName} barbers={(data ?? []).map((m) => m.name)} />;
}

export default function Page(props: PageProps<"/primo-avvio/[step]">) {
  return (
    <Suspense fallback={null}>
      <Content params={props.params} />
    </Suspense>
  );
}
