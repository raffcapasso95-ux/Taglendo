"use client";

import { useActionState, useRef, useState } from "react";
import { Button, Card, Field, Toggle } from "@/components/ui";
import { FormAlert } from "@/components/auth/FormAlert";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { saveServices, type StepState } from "@/lib/onboarding/actions";
import { formatPrice } from "@/lib/dates/format";
import { LIMITS } from "@/lib/rules/forms";
import { BackLink } from "./BackLink";
import { Frame } from "./Frame";
import { Preview, PreviewRows, PreviewSection } from "./Preview";
import styles from "./Step.module.css";

const copy = onboardingCopy.services;
const initial: StepState = {};

export type ServiceDraft = {
  id: string;
  name: string;
  duration: string;
  price: string;
  enabled: boolean;
};

/** I servizi più comuni (A8). L'ultimo parte spento. */
export const PRESET_SERVICES: ServiceDraft[] = [
  { id: "p1", name: "Taglio uomo", duration: "30", price: "20", enabled: true },
  { id: "p2", name: "Barba", duration: "20", price: "12", enabled: true },
  { id: "p3", name: "Taglio e barba", duration: "50", price: "30", enabled: true },
  { id: "p4", name: "Rasatura classica", duration: "30", price: "18", enabled: true },
  { id: "p5", name: "Taglio bambino", duration: "25", price: "15", enabled: true },
  { id: "p6", name: "Taglio lungo", duration: "45", price: "28", enabled: false },
];

/** "20" o "9,50" → centesimi. Null se non è un prezzo. */
function parsePriceCents(text: string): number | null {
  const n = Number(text.trim().replace(",", "."));
  if (!text.trim() || !Number.isFinite(n) || n < 0 || n > 9999) return null;
  return Math.round(n * 100);
}

function parseDuration(text: string): number | null {
  const n = Number(text.trim());
  return Number.isInteger(n) && n >= 5 && n <= 240 ? n : null;
}

type Props = {
  doneUpTo: number;
  salon: { name: string; address: string; phone: string };
  initial: ServiceDraft[];
  showPrices: boolean;
};

export function StepServices({ doneUpTo, salon, initial: init, showPrices: initialPrices }: Props) {
  const [state, action, pending] = useActionState(saveServices, initial);
  const [list, setList] = useState<ServiceDraft[]>(init);
  const [showPrices, setShowPrices] = useState(initialPrices);
  const [editing, setEditing] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | undefined>();
  const added = useRef(0);

  const patch = (id: string, change: Partial<ServiceDraft>) =>
    setList((cur) => cur.map((s) => (s.id === id ? { ...s, ...change } : s)));

  const valid = list.filter((s) => s.enabled);
  const rows = valid.flatMap((s) => {
    const duration = parseDuration(s.duration);
    const cents = parsePriceCents(s.price);
    return s.name.trim() && duration != null && cents != null
      ? [{ label: s.name.trim(), sub: `${duration} min`, value: showPrices ? formatPrice(cents) : "" }]
      : [];
  });

  const payload = JSON.stringify(
    valid.map((s) => ({
      name: s.name.trim(),
      durationMin: parseDuration(s.duration) ?? 0,
      priceCents: parsePriceCents(s.price) ?? -1,
    })),
  );

  const add = () => {
    const id = `nuovo-${++added.current}`;
    setList((cur) => [...cur, { id, name: "", duration: "30", price: "", enabled: true }]);
    setEditing(id);
  };

  return (
    <Frame
      step={3}
      doneUpTo={doneUpTo}
      title={copy.title}
      lead={
        <>
          <span className={styles.phoneLead}>{copy.lead}</span>
          <span className={styles.desktopLead}>{copy.desktopLead}</span>
        </>
      }
      preview={
        <Preview {...salon}>
          <PreviewSection title={onboardingCopy.preview.services}>
            <PreviewRows rows={rows.slice(0, 6)} />
          </PreviewSection>
        </Preview>
      }
      actions={
        <>
          <BackLink step={3} />
          <Button type="submit" form="step-form" size="large" disabled={pending}>
            {onboardingCopy.next}
          </Button>
        </>
      }
    >
      <form
        id="step-form"
        action={action}
        className={styles.form}
        noValidate
        onSubmit={(e) => {
          const bad = valid.find((s) => !s.name.trim() || parseDuration(s.duration) == null || parsePriceCents(s.price) == null);
          if (bad) {
            e.preventDefault();
            setEditing(bad.id);
            setLocalError(
              !bad.name.trim()
                ? onboardingCopy.errors.serviceName
                : parseDuration(bad.duration) == null
                  ? onboardingCopy.errors.serviceDuration
                  : onboardingCopy.errors.servicePrice,
            );
          } else {
            setLocalError(undefined);
          }
        }}
      >
        <input type="hidden" name="payload" value={payload} />
        <input type="hidden" name="showPrices" value={showPrices ? "1" : "0"} />
        {(localError ?? state.error) ? <FormAlert>{localError ?? state.error}</FormAlert> : null}

        <Card flush>
          {list.map((s) => {
            const duration = parseDuration(s.duration);
            const cents = parsePriceCents(s.price);
            const summary = s.name.trim() && duration != null && cents != null ? `${duration} min · ${formatPrice(cents)}` : undefined;
            return (
              <div key={s.id}>
                <div className={styles.serviceRow}>
                  <Toggle
                    label={s.name.trim() || "—"}
                    description={summary}
                    checked={s.enabled}
                    onChange={(enabled) => patch(s.id, { enabled })}
                    className={s.enabled ? undefined : styles.serviceOff}
                  />
                  <button
                    type="button"
                    className={styles.serviceEdit}
                    aria-expanded={editing === s.id}
                    aria-label={`${onboardingCopy.salon.edit}: ${s.name.trim() || copy.name}`}
                    onClick={() => setEditing(editing === s.id ? null : s.id)}
                  >
                    {onboardingCopy.salon.edit}
                  </button>
                </div>
                {editing === s.id ? (
                  <div className={styles.editor}>
                    <Field size="large" label={copy.name} maxLength={LIMITS.serviceName} value={s.name} onChange={(e) => patch(s.id, { name: e.target.value })} />
                    <div className={styles.pair}>
                      <Field size="large" label={`${copy.duration} (min)`} inputMode="numeric" value={s.duration} onChange={(e) => patch(s.id, { duration: e.target.value })} />
                      <Field size="large" label={`${copy.price} (€)`} inputMode="decimal" value={s.price} onChange={(e) => patch(s.id, { price: e.target.value })} />
                    </div>
                    <Button type="button" variant="secondary" size="small" onClick={() => setEditing(null)}>
                      {copy.save}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </Card>
        <button type="button" className={styles.addButton} onClick={add}>
          {copy.add}
        </button>
        <Card flush className={styles.breakCard}>
          <Toggle label={copy.pricesLabel} description={showPrices ? copy.pricesOn : copy.pricesOff} checked={showPrices} onChange={setShowPrices} />
        </Card>
      </form>
    </Frame>
  );
}
