"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Segmented, Toggle, ToastProvider, useToast } from "@/components/ui";
import listino from "@/components/listino/Listino.module.css";
import { alertsCopy as copy } from "@/lib/copy/notify";
import { saveAlertPrefs, type AlertPrefs } from "@/lib/settings/actions";
import { PushToggle } from "./PushToggle";
import styles from "./Rules.module.css";

type Props = { initial: AlertPrefs; salonName: string; isOwner: boolean; others: string; vapidKey: string | undefined };

export function AlertsView(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ initial, salonName, isOwner, others, vapidKey }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const set = <K extends keyof AlertPrefs>(key: K, value: AlertPrefs[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () =>
    startSave(async () => {
      setError(null);
      const r = await saveAlertPrefs(draft);
      if (!r.ok) return setError(r.error);
      setSaved(draft);
      toast(copy.saved);
      router.refresh();
    });

  return (
    <main className={listino.page}>
      <header className={listino.head}>
        <Link href="/impostazioni" className={styles.back}>‹ {copy.back}</Link>
        <p className={listino.eyebrow}>{salonName}</p>
        <h1 className={listino.title}>{copy.title}</h1>
      </header>

      <section className={listino.section} aria-label={copy.title}>
        <div className={styles.card}>
          <Toggle label={copy.newBooking.label} description={copy.newBooking.sub} checked={draft.newBooking} onChange={(v) => set("newBooking", v)} />
          <Toggle label={copy.cancelled.label} description={copy.cancelled.sub} checked={draft.clientCancel} onChange={(v) => set("clientCancel", v)} />
          <Toggle label={copy.summary.label} description={copy.summary.sub} checked={draft.dailySummary} onChange={(v) => set("dailySummary", v)} />
        </div>
      </section>

      <section className={listino.section} aria-labelledby="how-title">
        <h2 id="how-title" className={listino.sectionTitle}>{copy.how}</h2>
        <Segmented
          label={copy.how}
          value={draft.channel}
          onChange={(v) => set("channel", v)}
          options={[
            { value: "push", label: copy.channels.push },
            { value: "email", label: copy.channels.email },
            { value: "both", label: copy.channels.both },
          ]}
          fullWidth
        />
        {isOwner ? (
          <div className={styles.card}>
            <Toggle label={copy.onlyMine.label} description={copy.onlyMine.sub(others)} checked={draft.onlyMine} onChange={(v) => set("onlyMine", v)} />
          </div>
        ) : (
          <p className={listino.note}>{copy.barberNote}</p>
        )}
      </section>

      <section className={listino.section}>
        <div className={styles.card}>
          <PushToggle vapidKey={vapidKey} />
        </div>
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
