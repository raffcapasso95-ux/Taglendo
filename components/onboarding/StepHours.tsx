"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Card, Field, Toggle } from "@/components/ui";
import { FormAlert } from "@/components/auth/FormAlert";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { saveHours, type StepState } from "@/lib/onboarding/actions";
import { parseTime, summarizeWeek, toWeek, validateHours } from "@/lib/rules/hours";
import { BackLink } from "./BackLink";
import { Frame } from "./Frame";
import { Preview, PreviewRows, PreviewSection } from "./Preview";
import styles from "./Step.module.css";

const copy = onboardingCopy.hours;
const initial: StepState = {};
/** Da lunedì a domenica, come nei design (L M M G V S D). */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export type HoursInitial = { days: number[]; open: string; close: string; breakOn: boolean; breakStart: string; breakEnd: string };

type Props = {
  doneUpTo: number;
  salon: { name: string; address: string; phone: string };
  initial: HoursInitial;
};

export function StepHours({ doneUpTo, salon, initial: init }: Props) {
  const [state, action, pending] = useActionState(saveHours, initial);
  const [days, setDays] = useState<number[]>(init.days);
  const [open, setOpen] = useState(init.open);
  const [close, setClose] = useState(init.close);
  const [breakOn, setBreakOn] = useState(init.breakOn);
  const [breakStart, setBreakStart] = useState(init.breakStart);
  const [breakEnd, setBreakEnd] = useState(init.breakEnd);

  // L'anteprima segue gli orari finché sono validi; se scrivi a metà resta l'ultima versione buona.
  const rows = useMemo(() => {
    const openMin = parseTime(open);
    const closeMin = parseTime(close);
    const bs = parseTime(breakStart);
    const be = parseTime(breakEnd);
    if (openMin == null || closeMin == null) return null;
    if (breakOn && (bs == null || be == null)) return null;
    const input = { days, openMin, closeMin, breakMin: breakOn && bs != null && be != null ? { start: bs, end: be } : null };
    return validateHours(input) ? null : summarizeWeek(toWeek(input));
  }, [days, open, close, breakOn, breakStart, breakEnd]);
  const [lastRows, setLastRows] = useState(() => rows ?? []);
  if (rows && rows !== lastRows) setLastRows(rows);

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const err = (field: string) => (state.field === field ? state.error : undefined);
  const payload = JSON.stringify({ days, open, close, breakOn, breakStart, breakEnd });

  return (
    <Frame
      step={2}
      doneUpTo={doneUpTo}
      title={copy.title}
      preview={
        <Preview {...salon}>
          <PreviewSection title={onboardingCopy.preview.hours}>
            <PreviewRows rows={lastRows} />
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
        <input type="hidden" name="payload" value={payload} />
        {state.error && !state.field ? <FormAlert>{state.error}</FormAlert> : null}

        <div>
          <p className={styles.label}>{copy.days}</p>
          <div className={styles.days} role="group" aria-label={copy.days}>
            {ORDER.map((d) => (
              <button
                key={d}
                type="button"
                className={styles.day}
                aria-pressed={days.includes(d)}
                aria-label={copy.dayNames[d]}
                onClick={() => toggleDay(d)}
              >
                {copy.dayLetters[d]}
              </button>
            ))}
          </div>
          {err("days") ? <p className={styles.fieldError} role="alert">{err("days")}</p> : null}
        </div>

        <div>
          <p className={styles.label}>{copy.schedule}</p>
          <div className={styles.pair}>
            <Field size="large" label={copy.opens} inputMode="numeric" placeholder="9:00" value={open} onChange={(e) => setOpen(e.target.value)} error={err("open")} />
            <Field size="large" label={copy.closes} inputMode="numeric" placeholder="19:00" value={close} onChange={(e) => setClose(e.target.value)} error={err("close")} />
          </div>
        </div>

        <Card flush className={styles.breakCard}>
          <Toggle label={copy.breakTitle} description={copy.breakText} checked={breakOn} onChange={setBreakOn} />
        </Card>
        {breakOn ? (
          <div className={styles.pair}>
            <Field size="large" label={copy.from} inputMode="numeric" placeholder="13:00" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} error={err("breakStart")} />
            <Field size="large" label={copy.to} inputMode="numeric" placeholder="14:30" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} error={err("breakEnd")} />
          </div>
        ) : null}
      </form>
    </Frame>
  );
}
