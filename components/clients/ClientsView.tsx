"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ButtonLink, Field, ToastProvider, useToast } from "@/components/ui";
import { initials, firstName } from "@/lib/rules/agenda";
import {
  applyFilter,
  greetingMessage,
  groupByLetter,
  isRecall,
  matchesClient,
  recallMessage,
  rowChip,
  usualLine,
  type ClientFilter,
  type ClientRow,
} from "@/lib/rules/clients";
import { whatsappLink } from "@/lib/rules/whatsapp";
import styles from "./Clients.module.css";

type Props = {
  rows: ClientRow[];
  today: string;
  multipleOperators: boolean;
  canEdit: boolean;
  bookingUrl: string;
  salonName: string;
};

export function ClientsView(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ rows, today, multipleOperators, canEdit, bookingUrl, salonName }: Props) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("all");

  const counts = useMemo(
    () => ({
      all: rows.length,
      today: rows.filter((c) => c.hasToday).length,
      recall: rows.filter((c) => isRecall(c, today)).length,
    }),
    [rows, today],
  );

  const visible = useMemo(() => applyFilter(rows, filter, today).filter((c) => matchesClient(c, query)), [rows, filter, today, query]);
  const grouped = useMemo(() => groupByLetter(visible), [visible]);
  const showLetters = filter === "all" && query.trim() === "";
  const typed = query.trim();

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: salonName, url: bookingUrl });
        return;
      }
      await navigator.clipboard.writeText(bookingUrl);
      toast("Link copiato", bookingUrl);
    } catch {
      // annullato o senza permesso per gli appunti
    }
  };

  const filters: Array<{ key: ClientFilter; label: string }> = [
    { key: "all", label: "Tutti" },
    { key: "today", label: "Oggi in agenda" },
    { key: "recall", label: "Da richiamare" },
  ];

  const row = (c: ClientRow) => {
    const chip = rowChip(c, today);
    const wa = whatsappLink(c.phone, isRecall(c, today) ? recallMessage(firstName(c.name)) : greetingMessage(firstName(c.name)));
    return (
      <li key={c.id} className={styles.row}>
        <Link href={`/clienti/${c.id}`} className={styles.rowLink}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(c.name)}
          </span>
          <span className={styles.rowText}>
            <span className={styles.name}>{c.name}</span>
            <span className={styles.sub}>{usualLine(c, multipleOperators)}</span>
          </span>
          <span className={chip.tone === "next" ? styles.chipNext : chip.tone === "recall" ? styles.chipRecall : styles.chip}>{chip.text}</span>
        </Link>
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={styles.wa} aria-label={`WhatsApp a ${c.name}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8L4 20z" />
            </svg>
          </a>
        ) : null}
      </li>
    );
  };

  const emptyRubric = rows.length === 0;

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>La tua rubrica</p>
          <h1 className={styles.title}>Clienti</h1>
        </div>
        {canEdit ? <ButtonLink href="/agenda?nuovo=nuovo">+ Nuovo</ButtonLink> : null}
      </header>

      {!emptyRubric ? (
        <>
          <Field
            size="large"
            label="Cerca per nome o ultime cifre del telefono"
            type="search"
            inputMode="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={styles.filters} role="group" aria-label="Filtri">
            {filters.map((f) => (
              <button key={f.key} type="button" className={styles.filter} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label} · {counts[f.key]}
              </button>
            ))}
          </div>
          {filter === "recall" ? (
            <p className={styles.hint}>Non vengono da più di 5 settimane e non hanno appuntamenti. Un messaggio su WhatsApp è il modo più rapido per riportarli in poltrona.</p>
          ) : filter === "today" ? (
            <p className={styles.hint}>Clienti con un appuntamento oggi.</p>
          ) : null}
        </>
      ) : null}

      {visible.length > 0 ? (
        showLetters ? (
          grouped.map((g) => (
            <section key={g.letter} aria-label={g.letter} className={styles.group}>
              <h2 className={styles.letter}>{g.letter}</h2>
              <ul className={styles.list}>{g.rows.map(row)}</ul>
            </section>
          ))
        ) : (
          <ul className={styles.list}>{grouped.flatMap((g) => g.rows).map(row)}</ul>
        )
      ) : (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>
            {emptyRubric
              ? "La rubrica è ancora vuota"
              : typed
                ? `Nessun cliente per “${typed}”`
                : filter === "recall"
                  ? "Nessuno da richiamare: ottimo lavoro."
                  : "Nessun cliente in agenda oggi"}
          </h2>
          {emptyRubric ? (
            <p className={styles.emptyText}>Si riempie da sola: ogni cliente che prenota dal link o che inserisci in agenda finisce qui.</p>
          ) : typed ? (
            <p className={styles.emptyText}>Controlla come è scritto il nome, oppure cerca le ultime cifre del telefono.</p>
          ) : null}
          <div className={styles.emptyActions}>
            {emptyRubric ? (
              <button type="button" className={styles.emptyButton} onClick={share}>
                Condividi il tuo link
              </button>
            ) : null}
            {canEdit && typed ? (
              <ButtonLink href={`/agenda?nuovo=nuovo&nome=${encodeURIComponent(typed)}`} variant="secondary">
                Nuovo appuntamento con questo nome
              </ButtonLink>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
