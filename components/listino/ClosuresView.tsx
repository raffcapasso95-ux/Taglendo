"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, Card, Field, ResponsiveDialog, Segmented, ToastProvider, useToast } from "@/components/ui";
import dialog from "@/components/agenda/Dialogs.module.css";
import { deleteClosure, closureImpact, saveClosure, type Impacted } from "@/lib/listino/actions";
import type { ClosureItem } from "@/lib/listino/closures";
import { listinoCopy } from "@/lib/copy/listino";
import { longDay } from "@/lib/dates/rome";
import { closureRangeLabel } from "@/lib/rules/closures";
import { clock, firstName } from "@/lib/rules/agenda";
import { whatsappLink } from "@/lib/rules/whatsapp";
import styles from "./Listino.module.css";

const copy = listinoCopy.closuresPage;

type Props = {
  canEdit: boolean;
  today: string;
  year: number;
  upcoming: ClosureItem[];
  past: ClosureItem[];
  operators: Array<{ id: string; name: string }>;
};

export function ClosuresView(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ canEdit, today, year, upcoming, past, operators }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<ClosureItem | "new" | null>(null);

  const row = (c: ClosureItem) => {
    const body = (
      <>
        <span className={styles.serviceText}>
          <span className={styles.serviceName}>{c.note || copy.defaultName}</span>
          <span className={styles.serviceMeta}>
            {closureRangeLabel(c.startsOn, c.endsOn, year)} · {c.memberName ? copy.only(c.memberName) : copy.whole}
          </span>
        </span>
        <span aria-hidden="true">›</span>
      </>
    );
    return canEdit ? (
      <button key={c.id} type="button" className={styles.navRowButton} onClick={() => setEditing(c)}>
        {body}
      </button>
    ) : (
      <div key={c.id} className={styles.navRowButton}>
        {body}
      </div>
    );
  };

  return (
    <main className={styles.page}>
      <Link href="/listino" className={styles.back}>
        <span aria-hidden="true">‹</span> {copy.back}
      </Link>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.note}>{copy.lead}</p>
      </header>

      <section className={styles.section} aria-labelledby="upcoming-title">
        <h2 id="upcoming-title" className={styles.sectionTitle}>
          {copy.upcoming}
        </h2>
        {upcoming.length > 0 ? <Card flush>{upcoming.map(row)}</Card> : <p className={styles.note}>{copy.empty}</p>}
        {canEdit ? (
          <button type="button" className={styles.add} onClick={() => setEditing("new")}>
            {copy.add}
          </button>
        ) : null}
      </section>

      {past.length > 0 ? (
        <section className={styles.section} aria-labelledby="past-title">
          <h2 id="past-title" className={styles.sectionTitle}>
            {copy.past}
          </h2>
          <Card flush>{past.map(row)}</Card>
        </section>
      ) : null}

      {editing ? (
        <ClosureDialog
          key={editing === "new" ? "new" : editing.id}
          closure={editing === "new" ? null : editing}
          today={today}
          operators={operators}
          onClose={() => setEditing(null)}
          onDone={(message) => {
            setEditing(null);
            toast(message);
            router.refresh();
          }}
          onRefresh={() => router.refresh()}
        />
      ) : null}
    </main>
  );
}

type DialogProps = {
  closure: ClosureItem | null;
  today: string;
  operators: Array<{ id: string; name: string }>;
  onClose: () => void;
  onDone: (message: string) => void;
  onRefresh: () => void;
};

function ClosureDialog({ closure, today, operators, onClose, onDone, onRefresh }: DialogProps) {
  const [from, setFrom] = useState(closure?.startsOn ?? today);
  const [to, setTo] = useState(closure?.endsOn ?? today);
  const [scope, setScope] = useState<"all" | "one">(closure?.memberId ? "one" : "all");
  const [memberId, setMemberId] = useState<string | null>(closure?.memberId ?? operators[0]?.id ?? null);
  const [note, setNote] = useState(closure?.note ?? "");
  const [impact, setImpact] = useState<Impacted[]>([]);
  const [notify, setNotify] = useState<Impacted[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [, startImpact] = useTransition();

  const member = scope === "one" ? memberId : null;
  const validRange = from !== "" && to !== "" && to >= from;

  // L'avviso "N appuntamenti in questi giorni" si aggiorna mentre scegli date e barbiere.
  useEffect(() => {
    if (!validRange) return;
    let cancelled = false;
    startImpact(async () => {
      const rows = await closureImpact({ startsOn: from, endsOn: to, memberId: member });
      if (!cancelled) setImpact(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [from, to, member, validRange]);

  const save = () =>
    startSave(async () => {
      setError(null);
      const result = await saveClosure({ id: closure?.id, startsOn: from, endsOn: to, memberId: member, note });
      if (!result.ok) return setError(result.error);
      if (result.impacted.length > 0) {
        onRefresh();
        setNotify(result.impacted);
      } else onDone(copy.saved);
    });

  const remove = () =>
    closure &&
    startSave(async () => {
      const result = await deleteClosure(closure.id);
      if (!result.ok) return setError(result.error);
      onDone(copy.removed);
    });

  if (notify) {
    return (
      <ResponsiveDialog open onClose={() => onDone(copy.saved)} title={copy.warnTitle} footer={<Button size="large" onClick={() => onDone(copy.saved)}>{copy.warnDone}</Button>}>
        <div className={dialog.form}>
          <p className={dialog.hint}>{copy.warnText}</p>
          <ul className={dialog.list}>
            {notify.map((a) => {
              const link = whatsappLink(
                a.phone,
                copy.message(firstName(a.clientName), `il ${longDay(a.date)}`, clock(a.startMin)),
              );
              return (
                <li key={a.id}>
                  <div className={dialog.listButton}>
                    <span>
                      {a.clientName}
                      <span className={dialog.listSub}>
                        {" "}
                        · {longDay(a.date)}, {clock(a.startMin)}
                      </span>
                    </span>
                    {link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer" className={dialog.linkButton}>
                        {copy.whatsapp}
                      </a>
                    ) : (
                      <span className={dialog.listSub}>{copy.noPhone}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={closure ? copy.editTitle : copy.newTitle}
      footer={
        <>
          {closure ? (
            <Button variant="secondary" size="large" disabled={saving} onClick={remove}>
              {copy.remove}
            </Button>
          ) : null}
          <Button size="large" disabled={!validRange || saving || (scope === "one" && !memberId)} onClick={save}>
            {copy.save}
          </Button>
        </>
      }
    >
      <div className={dialog.form}>
        {error ? (
          <div className={dialog.alert} role="alert">
            {error}
          </div>
        ) : null}
        <div className={dialog.pair}>
          <label className={dialog.hint}>
            <span className={dialog.sectionTitle}>{copy.from}</span>
            <input type="date" className={dialog.dateInput} value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} />
          </label>
          <label className={dialog.hint}>
            <span className={dialog.sectionTitle}>{copy.to}</span>
            <input type="date" className={dialog.dateInput} min={from} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <section className={dialog.section}>
          <h3 className={dialog.sectionTitle}>{copy.who}</h3>
          <Segmented
            label={copy.who}
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: copy.all },
              { value: "one", label: copy.one },
            ]}
            fullWidth
          />
          {scope === "one" ? (
            <div className={dialog.chips} role="group" aria-label={copy.chooseBarber}>
              {operators.map((o) => (
                <button key={o.id} type="button" className={o.id === memberId ? dialog.chipOn : dialog.chip} aria-pressed={o.id === memberId} onClick={() => setMemberId(o.id)}>
                  {o.name}
                </button>
              ))}
            </div>
          ) : null}
        </section>
        <Field size="large" label={`${copy.note} · ${copy.optional}`} maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
        {impact.length > 0 ? (
          <div className={styles.impact} role="status">
            <p className={styles.impactTitle}>{copy.impactTitle(impact.length)}</p>
            <p className={styles.impactText}>{copy.impactText(impact.map((a) => a.clientName).join(", "))}</p>
          </div>
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
