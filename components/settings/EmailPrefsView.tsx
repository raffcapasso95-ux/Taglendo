"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Toggle, ToastProvider, useToast } from "@/components/ui";
import listino from "@/components/listino/Listino.module.css";
import { emailPrefsCopy as copy } from "@/lib/copy/notify";
import { saveEmailPrefs, type EmailPrefs } from "@/lib/settings/actions";
import styles from "./Rules.module.css";

export function EmailPrefsView(props: { initial: EmailPrefs }) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ initial }: { initial: EmailPrefs }) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  const save = () =>
    startSave(async () => {
      setError(null);
      const r = await saveEmailPrefs(draft);
      if (!r.ok) return setError(r.error);
      setSaved(draft);
      toast(copy.saved);
      router.refresh();
    });

  return (
    <main className={listino.page}>
      <header className={listino.head}>
        <Link href="/impostazioni" className={styles.back}>‹ {copy.back}</Link>
        <p className={listino.eyebrow}>{copy.eyebrow}</p>
        <h1 className={listino.title}>{copy.title}</h1>
      </header>
      <p className={listino.note}>{copy.intro}</p>

      <section className={listino.section} aria-label={copy.title}>
        <div className={styles.card}>
          <div className={styles.rule}>
            <span className={styles.ruleText}>
              <span className={styles.ruleLabel}>{copy.code.label}</span>
              <span className={styles.ruleHint}>{copy.code.sub}</span>
            </span>
          </div>
          <Toggle label={copy.confirmation.label} description={copy.confirmation.sub} checked={draft.confirmation} onChange={(v) => setDraft((d) => ({ ...d, confirmation: v }))} />
          <Toggle label={copy.reminder.label} description={copy.reminder.sub} checked={draft.reminder} onChange={(v) => setDraft((d) => ({ ...d, reminder: v }))} />
          <Toggle label={copy.cancellation.label} description={copy.cancellation.sub} checked={draft.cancellation} onChange={(v) => setDraft((d) => ({ ...d, cancellation: v }))} />
        </div>
        <Link href="/impostazioni/email/anteprima" className={styles.link}>
          <span>{copy.previews}</span>
          <span aria-hidden="true">›</span>
        </Link>
        <p className={listino.note}>{copy.moved}</p>
        <p className={listino.note}>{copy.whatsapp}</p>
      </section>

      {dirty || error ? (
        <div className={listino.dirty} role="region" aria-label="Salva">
          {error ? <p className={listino.dirtyText} role="alert">{error}</p> : null}
          <div className={listino.dirtyButtons}>
            <Button variant="secondary" size="large" onClick={() => { setDraft(saved); setError(null); }}>Annulla</Button>
            <Button size="large" disabled={saving || !dirty} onClick={save}>Salva</Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
