"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ButtonLink, ResponsiveDialog, ToastProvider, useToast } from "@/components/ui";
import { deleteClient, saveClientNote } from "@/lib/clients/actions";
import type { ClientDetail as Data } from "@/lib/clients/load";
import { LIMITS } from "@/lib/rules/forms";
import { formatPrice } from "@/lib/dates/format";
import { dayNumber, monthShort, romeMinutes, weekdayShort } from "@/lib/dates/rome";
import { clock, firstName, initials } from "@/lib/rules/agenda";
import { clientSinceLine, greetingMessage, isRecall, recallMessage, usualLine } from "@/lib/rules/clients";
import { whatsappLink } from "@/lib/rules/whatsapp";
import styles from "./Clients.module.css";

type Props = NonNullable<Data>;

export function ClientDetail(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ isOwner, row, note, today, createdDate, usual, usualMemberId, visits, next, multipleOperators, canEdit, canSeeContacts }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState(note);
  const [saved, setSaved] = useState(note);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const save = () =>
    startSave(async () => {
      setError(null);
      const result = await saveClientNote(row.id, text);
      if (!result.ok) return setError(result.error);
      setSaved(text.trim());
      toast("Nota salvata");
    });

  const remove = () =>
    startSave(async () => {
      setError(null);
      const result = await deleteClient(row.id);
      if (!result.ok) {
        setConfirming(false);
        return setError(result.error);
      }
      router.push("/clienti?eliminato=1");
    });

  const wa = whatsappLink(row.phone, isRecall(row, today) ? recallMessage(firstName(row.name)) : greetingMessage(firstName(row.name)));
  const rebook = new URLSearchParams({ nuovo: row.id });
  if (usual) rebook.set("servizio", usual.id);
  if (usualMemberId) rebook.set("barbiere", usualMemberId);

  const dateText = (d: string) => `${weekdayShort(d)} ${dayNumber(d)} ${monthShort(d)}`;
  const nextDate = next ? row.nextDate : null;

  return (
    <main className={styles.page}>
      <Link href="/clienti" className={styles.back}>
        ‹ Clienti
      </Link>

      <header className={styles.person}>
        <span className={styles.avatarLarge} aria-hidden="true">
          {initials(row.name)}
        </span>
        <div>
          <h1 className={styles.title}>{row.name}</h1>
          <p className={styles.sub}>{clientSinceLine(createdDate, row.visits)}</p>
        </div>
      </header>

      <section className={styles.usual} aria-label="Il solito">
        <span className={styles.usualLabel}>Il solito</span>
        <span className={styles.usualName}>{usual ? usual.name : "Ancora nessun servizio"}</span>
        {usual ? (
          <span className={styles.usualMeta}>
            {usualLine(row, multipleOperators).replace(/^Il solito · /, "")} · {usual.durationMin} min · {formatPrice(usual.priceCents)}
          </span>
        ) : null}
        {canEdit && usual ? (
          <ButtonLink href={`/agenda?${rebook.toString()}`} variant="accent" size="large">
            Prenota il solito
          </ButtonLink>
        ) : null}
      </section>

      <section className={styles.card} aria-label="Contatti">
        {canSeeContacts ? (
          row.phone ? (
            <>
              <p className={styles.contact}>{row.phone}</p>
              <div className={styles.contactActions}>
                {wa ? (
                  <ButtonLink href={wa} variant="secondary" target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </ButtonLink>
                ) : null}
                <ButtonLink href={`tel:${row.phone.replace(/\s/g, "")}`} variant="secondary">
                  Chiama
                </ButtonLink>
              </div>
            </>
          ) : (
            <p className={styles.sub}>Nessun telefono salvato per questo cliente.</p>
          )
        ) : (
          <p className={styles.sub}>I contatti dei clienti li vede solo il titolare.</p>
        )}
        {canSeeContacts && row.email ? <p className={styles.contact}>{row.email}</p> : null}
      </section>

      {next && nextDate ? (
        <section className={styles.card} aria-label="Prossimo appuntamento">
          <span className={styles.usualLabelDark}>Prossimo appuntamento</span>
          <span className={styles.contact}>
            {dateText(nextDate)} · {clock(row.nextMin ?? romeMinutes(new Date(next.startsAt)))}
          </span>
          <span className={styles.sub}>
            {next.service}
            {multipleOperators && next.member ? ` · ${next.member}` : ""}
          </span>
        </section>
      ) : null}

      <section className={styles.card} aria-label="Note">
        <label className={styles.noteLabel}>
          <span className={styles.noteHead}>
            <span className={styles.noteTitle}>Preferenze e note private</span>
            <span className={styles.sub}>Solo per te</span>
          </span>
          <textarea
            className={styles.textarea}
            rows={3}
            maxLength={LIMITS.clientNote}
            value={text}
            readOnly={!canEdit}
            placeholder="Es. sfumatura bassa, niente riga"
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {canEdit ? (
          <Button size="large" disabled={saving || text.trim() === saved} onClick={save}>
            Salva nota
          </Button>
        ) : null}
      </section>

      <section aria-labelledby="visits-title" className={styles.group}>
        <h2 id="visits-title" className={styles.letter}>
          Ultime visite
        </h2>
        {visits.length > 0 ? (
          <ul className={styles.list}>
            {visits.map((v) => (
              <li key={v.id} className={styles.visit}>
                <span>
                  <span className={styles.name}>{v.service}</span>
                  <span className={styles.sub}>
                    {dateText(v.date)}
                    {multipleOperators && v.member ? ` · ${v.member}` : ""}
                  </span>
                </span>
                <span className={styles.name}>{formatPrice(v.priceCents)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.sub}>Ancora nessuna visita.</p>
        )}
      </section>

      {isOwner ? (
        <section aria-labelledby="privacy-title" className={styles.group}>
          <h2 id="privacy-title" className={styles.letter}>
            Dati e privacy
          </h2>
          <div className={styles.list}>
            <a className={styles.privacyRow} href={`/clienti/${row.id}/esporta`} download>
              <span className={styles.rowText}>
                <span className={styles.name}>Esporta i dati di {firstName(row.name)}</span>
                <span className={styles.sub}>File con contatti, note e storico visite</span>
              </span>
              <span aria-hidden="true">›</span>
            </a>
            <button type="button" className={styles.privacyRow} onClick={() => setConfirming(true)}>
              <span className={styles.rowText}>
                <span className={styles.name}>Elimina cliente</span>
                <span className={styles.sub}>Su richiesta del cliente</span>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </section>
      ) : null}

      {confirming ? (
        <ResponsiveDialog
          open
          onClose={() => setConfirming(false)}
          title={`Eliminare ${row.name}?`}
          footer={
            <>
              <Button variant="secondary" size="large" onClick={() => setConfirming(false)}>
                Annulla
              </Button>
              <Button variant="danger" size="large" disabled={saving} onClick={remove}>
                Elimina cliente
              </Button>
            </>
          }
        >
          <p className={styles.confirmText}>
            Cancelliamo contatti, note e storico delle visite. Gli incassi restano nei totali, senza nome. Gli appuntamenti futuri vengono annullati.
          </p>
        </ResponsiveDialog>
      ) : null}
    </main>
  );
}
