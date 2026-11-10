"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Field, useToast } from "@/components/ui";
import { updateClient } from "@/lib/clients/actions";
import { LIMITS } from "@/lib/rules/forms";
import styles from "./Clients.module.css";

type Props = { clientId: string; name: string; phone: string | null; email: string | null; canEdit: boolean; canSeeContacts: boolean };

const PenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);

/**
 * NUOVO: «Dati del cliente» nella scheda. Si leggono nome, telefono ed email; con «Modifica dati»
 * i campi si aprono lì stesso, con Salva e Annulla. Telefono ed email solo a chi può vedere i contatti.
 */
export function ClientInfo({ clientId, name, phone, email, canEdit, canSeeContacts }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name, phone: phone ?? "", email: email ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const open = () => {
    setDraft({ name, phone: phone ?? "", email: email ?? "" });
    setError(null);
    setEditing(true);
  };

  const save = () =>
    start(async () => {
      setError(null);
      const result = await updateClient(clientId, canSeeContacts ? draft : { name: draft.name });
      if (!result.ok) return setError(result.error);
      toast("Dati salvati", draft.name.trim());
      setEditing(false);
      router.refresh();
    });

  return (
    <section className={styles.infoCard} aria-labelledby="dati-cliente">
      <div className={styles.infoHead}>
        <h2 className={styles.infoTitle} id="dati-cliente">
          Dati del cliente
        </h2>
        {canEdit && !editing ? (
          <button type="button" className={styles.editButton} onClick={open}>
            <PenIcon />
            Modifica dati
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className={styles.infoForm}>
          <Field size="large" label="Nome e cognome" maxLength={LIMITS.clientName} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} autoFocus />
          {canSeeContacts ? (
            <>
              <Field size="large" label="Telefono · facoltativo, per WhatsApp" type="tel" inputMode="tel" maxLength={LIMITS.phone} value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
              <Field size="large" label="Email · facoltativa, per conferma e promemoria" type="email" inputMode="email" autoComplete="off" maxLength={LIMITS.email} value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
            </>
          ) : (
            <p className={styles.sub}>Telefono ed email li cambia chi può vedere i contatti dei clienti.</p>
          )}
          {error ? (
            <p className={styles.infoError} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.infoActions}>
            <Button variant="secondary" size="large" onClick={() => setEditing(false)}>
              Annulla
            </Button>
            <Button size="large" disabled={saving || !draft.name.trim()} onClick={save}>
              {saving ? "Salvataggio…" : "Salva"}
            </Button>
          </div>
        </div>
      ) : (
        <dl className={styles.infoList}>
          <div className={styles.infoRow}>
            <dt>Nome</dt>
            <dd>{name}</dd>
          </div>
          {canSeeContacts ? (
            <>
              <div className={styles.infoRow}>
                <dt>Telefono</dt>
                <dd>{phone ? <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a> : <span className={styles.infoEmpty}>Non salvato</span>}</dd>
              </div>
              <div className={styles.infoRow}>
                <dt>Email</dt>
                <dd>{email ? email : <span className={styles.infoEmpty}>Non salvata</span>}</dd>
              </div>
            </>
          ) : (
            <p className={styles.sub}>I contatti dei clienti li vede solo il titolare.</p>
          )}
        </dl>
      )}
    </section>
  );
}
