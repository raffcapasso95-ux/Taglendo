"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, ResponsiveDialog, ToastProvider, useToast } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import dialog from "@/components/agenda/Dialogs.module.css";
import { removeService, saveService } from "@/lib/listino/actions";
import { listinoCopy } from "@/lib/copy/listino";
import { formatPrice } from "@/lib/dates/format";
import { LIMITS } from "@/lib/rules/forms";
import { span } from "@/lib/rules/agenda";
import styles from "./Listino.module.css";

const copy = listinoCopy;

export type ServiceRow = { id: string; name: string; durationMin: number; priceCents: number };

type Props = {
  canEdit: boolean;
  ownerName: string;
  services: ServiceRow[];
};

const DURATIONS = [15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120];

const priceText = (cents: number) => String(cents / 100).replace(".", ",");
const parsePrice = (text: string): number | null => {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() && Number.isFinite(n) && n >= 0 && n <= 9999 ? Math.round(n * 100) : null;
};

/** Le due schede di «Listino e orari»: Servizi e Orari. */
export function ListinoTabs({ active }: { active: "services" | "hours" }) {
  return (
    <nav className={styles.tabs} aria-label={copy.tabs.label}>
      <Link href="/listino" className={cx(styles.tab, active === "services" && styles.tabOn)} aria-current={active === "services" ? "page" : undefined}>
        {copy.tabs.services}
      </Link>
      <Link href="/listino/orari" className={cx(styles.tab, active === "hours" && styles.tabOn)} aria-current={active === "hours" ? "page" : undefined}>
        {copy.tabs.hours}
      </Link>
    </nav>
  );
}

export function ListinoView(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ canEdit, ownerName, services }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<ServiceRow | "new" | null>(null);

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        {!canEdit ? <p className={styles.note}>{copy.barberNote(ownerName)}</p> : null}
      </header>

      <ListinoTabs active="services" />

      <section className={styles.section} aria-labelledby="services-title">
        <div className={styles.sectionHead}>
          <h2 id="services-title" className={styles.sectionTitle}>
            {copy.services}
          </h2>
          <span className={styles.count}>{copy.serviceCount(services.length)}</span>
        </div>
        <ul className={styles.services}>
          {services.map((s) => (
            <li key={s.id}>
              <button type="button" className={styles.serviceCard} aria-label={`${copy.edit}: ${s.name}`} disabled={!canEdit} onClick={() => setEditing(s)}>
                <span className={styles.serviceIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="6" cy="6.5" r="2.8" />
                    <circle cx="6" cy="17.5" r="2.8" />
                    <path d="M8.3 8.2 20 18M8.3 15.8 20 6" />
                  </svg>
                </span>
                <span className={styles.serviceText}>
                  <span className={styles.serviceName}>{s.name}</span>
                  <span className={styles.serviceDur}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M12 7.5V12l3 2" />
                    </svg>
                    {s.durationMin} min
                  </span>
                </span>
                <span className={styles.servicePrice}>{formatPrice(s.priceCents)}</span>
                <span className={styles.chev} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {canEdit ? (
          <button type="button" className={styles.add} onClick={() => setEditing("new")}>
            {copy.addService}
          </button>
        ) : null}
        <p className={styles.note}>{copy.serviceNote}</p>
      </section>

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
