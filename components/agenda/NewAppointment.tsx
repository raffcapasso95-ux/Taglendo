"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Field, ResponsiveDialog } from "@/components/ui";
import { agendaCopy } from "@/lib/copy/agenda";
import { createAppointment, listSlots, walkIn, type Alternative, type Conflict, type Created, type SlotsResult } from "@/lib/agenda/actions";
import type { ClientOption, ServiceOption } from "@/lib/agenda/load";
import { formatPrice } from "@/lib/dates/format";
import { dayNumber, monthShort, weekdayShort } from "@/lib/dates/rome";
import { clock, type Operator } from "@/lib/rules/agenda";
import { LIMITS } from "@/lib/rules/forms";
import { DayPicker } from "./DayPicker";
import { TimeChips } from "./TimeChips";
import styles from "./Dialogs.module.css";

const copy = agendaCopy.form;

export type Prefill = { date?: string; memberId?: string | null; startMin?: number; clientId?: string | null; serviceId?: string | null; newName?: string | null };

type Props = {
  mode: "new" | "walkin";
  prefill?: Prefill;
  operators: Operator[];
  services: ServiceOption[];
  clients: ClientOption[];
  today: string;
  selectedDate: string;
  onClose: () => void;
  onCreated: (created: Created) => void;
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Etichetta breve di un giorno: "Oggi", "Domani", "Ven 30 ott". */
export function dayLabel(date: string, today: string, tomorrow: string): string {
  return date === today ? copy.today : date === tomorrow ? copy.tomorrow : `${weekdayShort(date)} ${dayNumber(date)} ${monthShort(date)}`;
}

export function NewAppointment({ mode, prefill, operators, services, clients, today, selectedDate, onClose, onCreated }: Props) {
  const walkInMode = mode === "walkin";
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(() => (prefill?.clientId && clients.some((c) => c.id === prefill.clientId) ? prefill.clientId : null));
  const [newMode, setNewMode] = useState(() => !prefill?.clientId && prefill?.newName !== undefined && prefill?.newName !== null);
  const [newName, setNewName] = useState(prefill?.newName ?? "");
  const [newPhone, setNewPhone] = useState("");
  const [serviceId, setServiceId] = useState(() => (prefill?.serviceId && services.some((s) => s.id === prefill.serviceId) ? prefill.serviceId : (services[0]?.id ?? "")));
  const [memberId, setMemberId] = useState<string | "any">(prefill?.memberId ?? "any");
  const [date, setDate] = useState(prefill?.date ?? selectedDate);
  const [startMin, setStartMin] = useState<number | null>(prefill?.startMin ?? null);
  const [slots, setSlots] = useState<SlotsResult | null>(null);
  const [loadingSlots, startSlots] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<{ message: string; conflict?: Conflict } | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const client = clients.find((c) => c.id === clientId);
  const operatorName = memberId === "any" ? null : operators.find((o) => o.id === memberId)?.name;

  // Gli orari liberi si ricaricano quando cambia servizio, barbiere o giorno.
  useEffect(() => {
    if (walkInMode || !serviceId) return;
    let cancelled = false;
    startSlots(async () => {
      const result = await listSlots({ serviceId, memberId: memberId === "any" ? null : memberId, date });
      if (cancelled) return;
      setSlots(result);
      setStartMin((current) => (current !== null && result.slots.some((s) => s.startMin === current && s.free) ? current : null));
    });
    return () => {
      cancelled = true;
    };
  }, [walkInMode, serviceId, memberId, date]);

  const matches = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return clients.slice(0, 6);
    const digits = q.replace(/\D/g, "");
    return clients.filter((c) => norm(c.name).includes(q) || (digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").endsWith(digits))).slice(0, 6);
  }, [clients, query]);

  const hasClient = clientId !== null || (newMode && newName.trim().length > 0);
  const canSave = hasClient && Boolean(service) && (walkInMode || startMin !== null) && !saving;

  const save = () =>
    startSave(async () => {
      setError(null);
      const who = clientId ? { clientId } : { newClient: { name: newName.trim(), phone: newPhone.trim() || null } };
      const result = walkInMode
        ? await walkIn({ ...who, serviceId, memberId: memberId === "any" ? null : memberId })
        : await createAppointment({ ...who, serviceId, memberId: memberId === "any" ? null : memberId, date, startMin: startMin ?? 0 });
      if (result.ok) onCreated(result);
      else setError({ message: result.error, conflict: result.conflict });
    });

  const pickAlternative = (alt: Alternative) => {
    setDate(alt.date);
    setStartMin(alt.startMin);
    if (memberId !== "any") setMemberId(alt.memberId);
    setError(null);
  };

  const recap = [
    client?.name ?? (newMode && newName.trim() ? newName.trim() : copy.chooseClient),
    service?.name ?? "",
    operatorName && operators.length > 1 ? `con ${operatorName}` : "",
    walkInMode ? copy.now : startMin !== null ? `${dayLabel(date, today, "")} · ${clock(startMin)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={walkInMode ? copy.titleWalkIn : copy.titleNew}
      footer={
        <>
          <Button variant="secondary" size="large" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button size="large" disabled={!canSave} onClick={save}>
            {saving ? copy.saving : copy.save}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {error ? (
          <div className={styles.alert} role="alert">
            <p className={styles.alertTitle}>{error.conflict?.title ?? error.message}</p>
            {error.conflict ? <p>{error.conflict.text}</p> : null}
            {error.conflict && error.conflict.alternatives.length > 0 ? (
              <div className={styles.chips}>
                {error.conflict.alternatives.map((a) => (
                  <button key={`${a.date}-${a.startMin}`} type="button" className={styles.chip} onClick={() => pickAlternative(a)}>
                    {dayLabel(a.date, today, "")} · {clock(a.startMin)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{copy.client}</h3>
          {clientId || newMode ? (
            <>
              {client ? (
                <p className={styles.sub}>
                  <strong>{client.name}</strong>
                  {client.phone ? ` · ${client.phone}` : ""}
                </p>
              ) : (
                <>
                  <Field size="large" label={copy.name} maxLength={LIMITS.clientName} value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                  <Field size="large" label={`${copy.phone} · ${copy.phoneHint}`} type="tel" inputMode="tel" maxLength={LIMITS.phone} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </>
              )}
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  setClientId(null);
                  setNewMode(false);
                }}
              >
                {copy.change}
              </button>
            </>
          ) : (
            <>
              <Field size="large" label={copy.search} value={query} onChange={(e) => setQuery(e.target.value)} />
              {matches.length > 0 ? (
                <ul className={styles.list}>
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button type="button" className={styles.listButton} onClick={() => setClientId(c.id)}>
                        <span>{c.name}</span>
                        {c.phone ? <span className={styles.listSub}>{c.phone}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.hint}>{copy.noClients}</p>
              )}
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  setNewMode(true);
                  setNewName(query.trim());
                }}
              >
                {copy.newClient}
              </button>
            </>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{copy.service}</h3>
          <div className={styles.chips}>
            {services.map((s) => (
              <button key={s.id} type="button" className={s.id === serviceId ? styles.chipOn : styles.chip} aria-pressed={s.id === serviceId} onClick={() => setServiceId(s.id)}>
                {s.name}
                <span className={styles.chipSub}>
                  {s.durationMin} min · {formatPrice(s.priceCents)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {operators.length > 1 ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{copy.barber}</h3>
            <div className={styles.chips}>
              <button type="button" className={memberId === "any" ? styles.chipOn : styles.chip} aria-pressed={memberId === "any"} onClick={() => setMemberId("any")}>
                {copy.anyone}
                <span className={styles.chipSub}>{copy.anyoneHint}</span>
              </button>
              {operators.map((o) => (
                <button key={o.id} type="button" className={memberId === o.id ? styles.chipOn : styles.chip} aria-pressed={memberId === o.id} onClick={() => setMemberId(o.id)}>
                  {o.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {walkInMode ? null : (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{copy.when}</h3>
            <DayPicker value={date} today={today} onChange={setDate} />
            <TimeChips result={slots} loading={loadingSlots} selected={startMin} onSelect={setStartMin} label={copy.slotsWith(operatorName ?? copy.anyone)} />
          </section>
        )}

        <p className={styles.recap}>{recap}</p>
      </div>
    </ResponsiveDialog>
  );
}
