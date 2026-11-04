"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, Field, ResponsiveDialog, Segmented, ToastProvider, useToast } from "@/components/ui";
import dialog from "@/components/agenda/Dialogs.module.css";
import { removeService, saveHours, saveService } from "@/lib/listino/actions";
import { listinoCopy } from "@/lib/copy/listino";
import { formatPrice } from "@/lib/dates/format";
import { formatMinutes } from "@/lib/rules/hours";
import { LIMITS } from "@/lib/rules/forms";
import { span } from "@/lib/rules/agenda";
import { hasBreak, previewText, setBreak, STEP, stepHours, toggleDay, type HoursDraft, type HoursField } from "@/lib/rules/listino";
import styles from "./Listino.module.css";

const copy = listinoCopy;

export type ServiceRow = { id: string; name: string; durationMin: number; priceCents: number };

type Props = {
  canEdit: boolean;
  ownerName: string;
  services: ServiceRow[];
  hours: HoursDraft;
  operatorNames: string;
};

const DURATIONS = [15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120];
/** Da lunedì a domenica, come nei design. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const LETTER = ["D", "L", "M", "M", "G", "V", "S"];
const DAY_NAME = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

const priceText = (cents: number) => String(cents / 100).replace(".", ",");
const parsePrice = (text: string): number | null => {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() && Number.isFinite(n) && n >= 0 && n <= 9999 ? Math.round(n * 100) : null;
};

export function ListinoView(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ canEdit, ownerName, services, hours, operatorNames }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<HoursDraft | null>(null);
  const [editing, setEditing] = useState<ServiceRow | "new" | null>(null);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const current = draft ?? hours;
  const edit = (next: HoursDraft) => setDraft(next);

  const saveHoursNow = () =>
    draft &&
    startSave(async () => {
      setError(null);
      const result = await saveHours(draft);
      if (!result.ok) return setError(result.error);
      setDraft(null);
      toast(copy.toasts.hoursSaved, copy.toasts.hoursSavedSub(result.outside));
      router.refresh();
    });

  const stepper = (field: HoursField, label: string) => (
    <div key={field} className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      {canEdit ? (
        <span className={styles.stepper}>
          <button type="button" className={styles.stepButton} aria-label={`${label} ${copy.before}`} onClick={() => edit(stepHours(current, field, -STEP[field]))}>
            −
          </button>
          <output className={styles.stepValue}>{formatMinutes(current[field])}</output>
          <button type="button" className={styles.stepButton} aria-label={`${label} ${copy.after}`} onClick={() => edit(stepHours(current, field, STEP[field]))}>
            +
          </button>
        </span>
      ) : (
        <span className={styles.stepValue}>{formatMinutes(current[field])}</span>
      )}
    </div>
  );

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        {!canEdit ? <p className={styles.note}>{copy.barberNote(ownerName)}</p> : null}
      </header>

      <section className={styles.section} aria-labelledby="services-title">
        <div className={styles.sectionHead}>
          <h2 id="services-title" className={styles.sectionTitle}>
            {copy.services}
          </h2>
          <span className={styles.count}>{copy.serviceCount(services.length)}</span>
        </div>
        <Card flush>
          {services.map((s) => (
            <div key={s.id} className={styles.service}>
              <div className={styles.serviceText}>
                <p className={styles.serviceName}>{s.name}</p>
                <p className={styles.serviceMeta}>
                  {s.durationMin} min · {formatPrice(s.priceCents)}
                </p>
              </div>
              {canEdit ? (
                <button type="button" className={styles.link} aria-label={`${copy.edit}: ${s.name}`} onClick={() => setEditing(s)}>
                  {copy.edit}
                </button>
              ) : null}
            </div>
          ))}
        </Card>
        {canEdit ? (
          <button type="button" className={styles.add} onClick={() => setEditing("new")}>
            {copy.addService}
          </button>
        ) : null}
        <p className={styles.note}>{copy.serviceNote}</p>
      </section>

      <section className={styles.section} aria-labelledby="days-title">
        <h2 id="days-title" className={styles.sectionTitle}>
          {copy.days}
        </h2>
        <div className={styles.days} role="group" aria-label={copy.days}>
          {DAY_ORDER.map((w) => {
            const open = !current.closedDays.includes(w);
            return (
              <button
                key={w}
                type="button"
                className={styles.day}
                aria-pressed={open}
                aria-label={`${DAY_NAME[w]}${open ? "" : ", chiuso"}`}
                disabled={!canEdit}
                onClick={() => edit(toggleDay(current, w))}
              >
                {LETTER[w]}
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="hours-title">
        <h2 id="hours-title" className={styles.sectionTitle}>
          {copy.hours}
        </h2>
        <Card flush>
          {stepper("open", copy.rows.open)}
          {stepper("close", copy.rows.close)}
          {hasBreak(current) ? stepper("breakStart", copy.rows.breakStart) : null}
          {hasBreak(current) ? stepper("breakEnd", copy.rows.breakEnd) : null}
        </Card>
        {canEdit ? (
          <Segmented
            label={copy.pause}
            value={hasBreak(current) ? "on" : "off"}
            onChange={(v) => edit(setBreak(current, v === "on"))}
            options={[
              { value: "on", label: `${copy.pause}: ${copy.yes}` },
              { value: "off", label: `${copy.pause}: ${copy.no}` },
            ]}
            fullWidth
          />
        ) : (
          <p className={styles.note}>
            {hasBreak(current) ? `${copy.pause} ${formatMinutes(current.breakStart)}–${formatMinutes(current.breakEnd)}` : "Orario continuato"}
          </p>
        )}
      </section>

      <Card flush>
        <Link href="/listino/chiusure" className={styles.navRow}>
          <span>{copy.closures}</span>
          <span aria-hidden="true">›</span>
        </Link>
        <Link href="/impostazioni/operatori" className={styles.navRow}>
          <span>
            {copy.operators}
            <span className={styles.navSub}>{operatorNames}</span>
          </span>
          <span aria-hidden="true">›</span>
        </Link>
      </Card>

      {draft ? (
        <div className={styles.dirty} role="region" aria-label={copy.saveHours}>
          <p className={styles.dirtyText}>{error ?? previewText(draft)}</p>
          <div className={styles.dirtyButtons}>
            <Button variant="secondary" size="large" onClick={() => { setDraft(null); setError(null); }}>
              {copy.cancel}
            </Button>
            <Button size="large" disabled={saving} onClick={saveHoursNow}>
              {copy.saveHours}
            </Button>
          </div>
        </div>
      ) : null}

      {editing ? <ServiceDialog key={editing === "new" ? "new" : editing.id} service={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDone={(message, sub) => { setEditing(null); toast(message, sub); router.refresh(); }} /> : null}
    </main>
  );
}

function ServiceDialog({ service, onClose, onDone }: { service: ServiceRow | null; onClose: () => void; onDone: (message: string, sub?: string) => void }) {
  const [name, setName] = useState(service?.name ?? "");
  const [duration, setDuration] = useState(service?.durationMin ?? 30);
  const [price, setPrice] = useState(service ? priceText(service.priceCents) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const cents = parsePrice(price);
  const durations = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b);

  const save = () =>
    cents !== null &&
    startSave(async () => {
      setError(null);
      const result = await saveService({ id: service?.id, name, durationMin: duration, priceCents: cents });
      if (!result.ok) return setError(result.error);
      onDone(result.created ? copy.toasts.serviceAdded : copy.toasts.serviceUpdated, `${name.trim()} · ${duration} min · ${formatPrice(cents)}`);
    });

  const remove = () =>
    service &&
    startSave(async () => {
      const result = await removeService(service.id);
      if (!result.ok) return setError(result.error);
      onDone(copy.toasts.serviceRemoved, copy.toasts.serviceRemovedSub);
    });

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={service ? copy.service.titleEdit : copy.service.titleNew}
      footer={
        <>
          {service ? (
            <Button variant="secondary" size="large" disabled={saving} onClick={remove}>
              {copy.service.remove}
            </Button>
          ) : null}
          <Button size="large" disabled={!name.trim() || cents === null || saving} onClick={save}>
            {copy.service.save}
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
        <Field size="large" label={copy.service.name} maxLength={LIMITS.serviceName} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <section className={dialog.section}>
          <h3 className={dialog.sectionTitle}>{copy.service.duration}</h3>
          <div className={dialog.chips}>
            {durations.map((d) => (
              <button key={d} type="button" className={d === duration ? dialog.chipOn : dialog.chip} aria-pressed={d === duration} onClick={() => setDuration(d)}>
                {span(d)}
              </button>
            ))}
          </div>
        </section>
        <Field size="large" label={`${copy.service.price} (€)`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        <p className={dialog.hint}>{copy.service.note}</p>
      </div>
    </ResponsiveDialog>
  );
}
