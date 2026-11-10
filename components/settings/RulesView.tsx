"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Segmented, ToastProvider, useToast } from "@/components/ui";
import listino from "@/components/listino/Listino.module.css";
import { rulesCopy as copy } from "@/lib/copy/rules";
import { saveRules, type Rules } from "@/lib/settings/actions";
import styles from "./Rules.module.css";

export function RulesView(props: { initial: Rules }) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

const opts = <T extends number>(o: Record<T, string>) => (Object.keys(o) as unknown as string[]).map((k) => ({ value: String(k), label: (o as Record<string, string>)[k]! }));

function Inner({ initial }: { initial: Rules }) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const set = <K extends keyof Rules>(key: K, value: Rules[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () =>
    startSave(async () => {
      setError(null);
      const r = await saveRules(draft);
      if (!r.ok) return setError(r.error);
      setSaved(draft);
      toast(copy.saved, copy.savedSub);
      router.refresh();
    });

  const toggle = (
    label: string,
    on: boolean,
    labels: { on: string; off: string; hintOn: string; hintOff: string },
    change: (v: boolean) => void,
  ) => (
    <div className={styles.rule}>
      <span className={styles.ruleText}>
        <span className={styles.ruleLabel}>{label}</span>
        <span className={styles.ruleHint}>{on ? labels.hintOn : labels.hintOff}</span>
      </span>
      <Segmented
        label={label}
        value={on ? "on" : "off"}
        onChange={(v) => change(v === "on")}
        options={[
          { value: "on", label: labels.on },
          { value: "off", label: labels.off },
        ]}
        fullWidth
      />
    </div>
  );

  const choice = <T extends number>(label: string, hint: string, options: Record<T, string>, value: T, change: (v: T) => void) => (
    <div className={styles.rule}>
      <span className={styles.ruleText}>
        <span className={styles.ruleLabel}>{label}</span>
        <span className={styles.ruleHint}>{hint}</span>
      </span>
      <Segmented label={label} value={String(value)} onChange={(v) => change(Number(v) as T)} options={opts(options)} fullWidth />
    </div>
  );

  return (
    <main className={listino.page}>
      <header className={listino.head}>
        <Link href="/salone" className={styles.back}>‹ {copy.back}</Link>
        <h1 className={listino.title}>{copy.title}</h1>
      </header>

      <section className={listino.section} aria-labelledby="rules-title">
        <h2 id="rules-title" className={listino.sectionTitle}>{copy.section}</h2>
        <div className={styles.card}>
          {toggle(copy.book.label, draft.bookingOnline, copy.book, (v) => set("bookingOnline", v))}
          {draft.bookingOnline ? toggle(copy.cancel.label, draft.cancelOnline, copy.cancel, (v) => set("cancelOnline", v)) : null}
          {toggle(copy.prices.label, draft.showPrices, copy.prices, (v) => set("showPrices", v))}
          {draft.bookingOnline ? (
            <>
              {choice(copy.notice.label, copy.notice.hint, copy.notice.options, draft.minNoticeMin, (v) => set("minNoticeMin", v))}
              {choice(copy.advance.label, copy.advance.hint, copy.advance.options, draft.maxAdvanceDays, (v) => set("maxAdvanceDays", v))}
              {choice(copy.step.label, copy.step.hint, copy.step.options, draft.slotStepMin, (v) => set("slotStepMin", v))}
              {draft.cancelOnline ? choice(copy.limit.label, copy.limit.hint, copy.limit.options, draft.cancelLimitMin, (v) => set("cancelLimitMin", v)) : null}
            </>
          ) : null}
        </div>
      </section>

      {dirty || error ? (
        <div className={listino.dirty} role="region" aria-label={copy.save}>
          {error ? <p className={listino.dirtyText} role="alert">{error}</p> : null}
          <div className={listino.dirtyButtons}>
            <Button variant="secondary" size="large" onClick={() => { setDraft(saved); setError(null); }}>{copy.cancelChanges}</Button>
            <Button size="large" disabled={saving || !dirty} onClick={save}>{copy.save}</Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
