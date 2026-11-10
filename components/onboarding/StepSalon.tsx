"use client";

import { useActionState, useState } from "react";
import { Button, Field, AddressField } from "@/components/ui";
import { FormAlert } from "@/components/auth/FormAlert";
import { onboardingCopy } from "@/lib/copy/onboarding";
import { saveSalon, type StepState } from "@/lib/onboarding/actions";
import { LIMITS } from "@/lib/rules/forms";
import { slugify } from "@/lib/rules/slug";
import { Frame } from "./Frame";
import { Preview, PreviewNote } from "./Preview";
import styles from "./Step.module.css";

const copy = onboardingCopy.salon;
const initial: StepState = {};

/** Indirizzo del sito senza "https://", come nei design ("taglendo.example/"). */
const siteHost = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/^https?:\/\//, "");

type Props = {
  doneUpTo: number;
  initial: { name: string; address: string; phone: string; slug: string; slugAuto: boolean };
};

export function StepSalon({ doneUpTo, initial: init }: Props) {
  const [state, action, pending] = useActionState(saveSalon, initial);
  const [name, setName] = useState(init.name);
  const [address, setAddress] = useState(init.address);
  const [phone, setPhone] = useState(init.phone);
  const [slug, setSlug] = useState(init.slug);
  const [slugAuto, setSlugAuto] = useState(init.slugAuto);
  const [editing, setEditing] = useState(false);

  // Finché non lo si cambia a mano, il link segue il nome del salone.
  const shownSlug = slugAuto ? slugify(name) : slug;
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <Frame
      step={1}
      doneUpTo={doneUpTo}
      title={copy.title}
      preview={
        <Preview name={name} address={address} phone={phone}>
          <PreviewNote />
        </Preview>
      }
      actions={
        <Button type="submit" form="step-form" size="large" disabled={pending}>
          {onboardingCopy.next}
        </Button>
      }
    >
      <form id="step-form" action={action} className={styles.form} noValidate>
        <input type="hidden" name="slug" value={shownSlug} />
        <input type="hidden" name="slugAuto" value={slugAuto ? "1" : "0"} />
        {state.error && !state.field ? <FormAlert>{state.error}</FormAlert> : null}
        <Field
          size="large"
          name="name"
          label={copy.name}
          autoComplete="organization"
          maxLength={LIMITS.salonName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={err("name")}
          autoFocus
        />
        <AddressField name="address" label={copy.address} value={address} onChange={setAddress} error={err("address")} />
        <Field
          size="large"
          name="phone"
          label={copy.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={LIMITS.phone}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          hint={copy.phoneHint}
          error={err("phone")}
        />
        <div className={styles.linkCard}>
          <p className={styles.linkTitle}>{copy.link}</p>
          {editing ? (
            <Field
              size="large"
              label={copy.link}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setSlugAuto(false);
              }}
              error={err("slug")}
              aria-label={copy.link}
            />
          ) : (
            <p className={styles.linkValue}>
              {siteHost}/<strong>{shownSlug}</strong>
            </p>
          )}
          {err("slug") && !editing ? <p className={styles.linkError}>{err("slug")}</p> : null}
          <button
            type="button"
            className={styles.linkEdit}
            onClick={() => {
              if (!editing) setSlug(shownSlug);
              setEditing((v) => !v);
            }}
          >
            {copy.edit}
          </button>
        </div>
      </form>
    </Frame>
  );
}
