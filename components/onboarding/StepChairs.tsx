"use client";

import { useActionState, useState } from "react";
import { Button, Card, Field, Segmented } from "@/components/ui";
import { FormAlert } from "@/components/auth/FormAlert";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { saveChairs, type StepState } from "@/lib/onboarding/actions";
import { LIMITS } from "@/lib/rules/forms";
import { BackLink } from "./BackLink";
import { Frame } from "./Frame";
import { Preview, PreviewChips, PreviewSection } from "./Preview";
import styles from "./Step.module.css";

const copy = onboardingCopy.chairs;
const initial: StepState = {};

type Props = {
  doneUpTo: number;
  salon: { name: string; address: string; phone: string };
  ownerName: string;
  /** Barbieri già salvati (poltrone 2 e 3), con l'email dell'invito se c'è. */
  barbers: Array<{ name: string; email: string }>;
};

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? "";
const initialOf = (name: string) => (Array.from(name.trim())[0] ?? "").toUpperCase();

export function StepChairs({ doneUpTo, salon, ownerName, barbers }: Props) {
  const [state, action, pending] = useActionState(saveChairs, initial);
  const [chairs, setChairs] = useState<"1" | "2" | "3">(String(Math.min(3, barbers.length + 1)) as "1" | "2" | "3");
  const [names, setNames] = useState<[string, string]>([barbers[0]?.name ?? "", barbers[1]?.name ?? ""]);
  const [emails, setEmails] = useState<[string, string]>([barbers[0]?.email ?? "", barbers[1]?.email ?? ""]);
  const count = Number(chairs);
  const visible = names.slice(0, count - 1);

  const people = [
    { initial: "★", name: onboardingCopy.preview.anyone },
    { initial: initialOf(ownerName), name: firstName(ownerName) },
    ...visible.filter((n) => n.trim()).map((n) => ({ initial: initialOf(n), name: n.trim() })),
  ];

  return (
    <Frame
      step={4}
      doneUpTo={doneUpTo}
      title={copy.title}
      preview={
        <Preview {...salon}>
          <PreviewSection title={onboardingCopy.preview.who}>
            <PreviewChips people={people} />
          </PreviewSection>
        </Preview>
      }
      actions={
        <>
          <BackLink step={4} />
          <Button type="submit" form="step-form" size="large" disabled={pending}>
            {onboardingCopy.finish}
          </Button>
        </>
      }
    >
      <form id="step-form" action={action} className={styles.form} noValidate>
        <input type="hidden" name="payload" value={JSON.stringify({ chairs: count, names: visible, emails: emails.slice(0, count - 1) })} />
        {state.error ? <FormAlert>{state.error}</FormAlert> : null}

        <div>
          <p className={styles.label}>{copy.count}</p>
          <Segmented
            label={copy.count}
            value={chairs}
            onChange={setChairs}
            fullWidth
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
            ]}
          />
        </div>

        <Card flush>
          <div className={styles.owner}>
            <div>
              <p className={styles.ownerName}>{ownerName}</p>
              <p className={styles.ownerRole}>
                {copy.owner} · {copy.chair(1)}
              </p>
            </div>
            <span className={styles.ownerYou}>{copy.you}</span>
          </div>
          {visible.map((n, i) => (
            <div key={i} className={styles.chair}>
              <Field
                size="large"
                label={copy.chair(i + 2)}
                placeholder={copy.placeholder}
                maxLength={LIMITS.memberName}
                value={n}
                onChange={(e) =>
                  setNames((cur) => {
                    const next: [string, string] = [...cur];
                    next[i] = e.target.value;
                    return next;
                  })
                }
                error={state.field === "names" && !n.trim() ? state.error : undefined}
              />
              <Field
                size="large"
                type="email"
                inputMode="email"
                autoComplete="off"
                label={copy.email(n)}
                placeholder="nome@esempio.it"
                maxLength={LIMITS.email}
                value={emails[i]}
                onChange={(e) =>
                  setEmails((cur) => {
                    const next: [string, string] = [...cur];
                    next[i] = e.target.value;
                    return next;
                  })
                }
                error={state.field === `email${i}` ? state.error : undefined}
              />
            </div>
          ))}
        </Card>
        <p className={styles.plan}>{copy.plan}</p>
      </form>
    </Frame>
  );
}
