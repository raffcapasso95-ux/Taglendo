"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { FormAlert } from "@/components/auth/FormAlert";
import { WeekEditor } from "@/components/listino/WeekEditor";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { listinoCopy } from "@/lib/copy/listino";
import { saveHours, type StepState } from "@/lib/onboarding/actions";
import { dayFromRanges, summarizeWeek, type WeekDay } from "@/lib/rules/hours";
import { canSaveWeek } from "@/lib/rules/listino";
import { BackLink } from "./BackLink";
import { Frame } from "./Frame";
import { Preview, PreviewRows, PreviewSection } from "./Preview";
import styles from "./Step.module.css";

const copy = onboardingCopy.hours;
const initial: StepState = {};

type Props = {
  doneUpTo: number;
  salon: { name: string; address: string; phone: string };
  initial: WeekDay[];
};

/** Passo 2: gli orari giorno per giorno, con lo stesso editor di Listino › Orari (fasce, copia su altri giorni). */
export function StepHours({ doneUpTo, salon, initial: init }: Props) {
  const [state, action, pending] = useActionState(saveHours, initial);
  const [week, setWeek] = useState<WeekDay[]>(init);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => summarizeWeek(week.map((d) => (d.closed ? { closed: true, ranges: [] } : d)).map(dayFromRanges)), [week]);

  return (
    <Frame
      step={2}
      doneUpTo={doneUpTo}
      title={copy.title}
      preview={
        <Preview {...salon}>
          <PreviewSection title={onboardingCopy.preview.hours}>
            <PreviewRows rows={rows} />
          </PreviewSection>
        </Preview>
      }
      actions={
        <>
          <BackLink step={2} />
          <Button type="submit" form="step-form" size="large" disabled={pending}>
            {onboardingCopy.next}
          </Button>
        </>
      }
    >
      <form id="step-form" action={action} className={styles.form} noValidate>
        <input type="hidden" name="payload" value={JSON.stringify(week)} />
        {(error ?? state.error) ? <FormAlert>{error ?? state.error}</FormAlert> : null}
        <p className={styles.lead}>{copy.lead}</p>
        <WeekEditor
          week={week}
          canEdit
          saving={pending}
          onChange={(next, done) => {
            if (!canSaveWeek(next)) return setError(listinoCopy.errors.hours);
            setError(null);
            setWeek(next);
            done?.();
          }}
        />
        <p className={styles.lead}>{copy.later}</p>
      </form>
    </Frame>
  );
}
