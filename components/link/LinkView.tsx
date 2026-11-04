"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink, ToastProvider, useToast } from "@/components/ui";
import styles from "./Link.module.css";

type Props = {
  salonName: string;
  url: string;
  prices: boolean;
  bookingOnline: boolean;
  cancelLabel: string;
  isOwner: boolean;
};

export function LinkView(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ salonName, url, prices, bookingOnline, cancelLabel, isOwner }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const shown = url.replace(/^https?:\/\//, "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Non riusciamo a copiare", "Seleziona il link e copialo a mano");
    }
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: salonName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      return; // annullato dall'utente
    }
    toast("Condivisione pronta", "Scegli WhatsApp, Instagram o un’altra app");
  };

  const rows: Array<[string, string]> = [
    ["Prenotazione online", bookingOnline ? "Attiva" : "Solo telefono"],
    ["Annullamento online", !bookingOnline ? "Solo telefono" : cancelLabel],
    ["Spostamenti", "Al telefono, col salone"],
  ];

  return (
    <main className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Prenotazioni dirette</p>
        <h1 className={styles.title}>Il tuo link</h1>
      </header>
      <p className={styles.intro}>
        {bookingOnline
          ? `I clienti vedono solo il tuo salone: servizi, ${prices ? "prezzi " : ""}e orari davvero liberi. Nessun marketplace, nessun nome di altri clienti.`
          : "Prenotazione online disattivata: il link mostra servizi, prezzi e orari, con il pulsante per chiamarti."}
      </p>

      <section className={styles.card} aria-label="Indirizzo della pagina">
        <span className={styles.salon}>{salonName}</span>
        <span className={styles.url} data-testid="salon-url">{shown}</span>
        <div className={styles.actions}>
          <Button size="large" onClick={copy}>
            {copied ? "✓ Link copiato" : "Copia link"}
          </Button>
          <Button variant="secondary" size="large" onClick={share}>
            Condividi su WhatsApp o Instagram
          </Button>
        </div>
        <ButtonLink href={url} variant="secondary" target="_blank" rel="noopener noreferrer">
          Apri la tua pagina
        </ButtonLink>
      </section>

      <section className={styles.rules} aria-label="Regole attive">
        {rows.map(([label, value]) => (
          <div key={label} className={styles.rule}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        {isOwner ? (
          <Link href="/impostazioni" className={styles.rulesLink}>
            <span>Cambia le regole in Impostazioni</span>
            <span aria-hidden="true">›</span>
          </Link>
        ) : null}
      </section>
    </main>
  );
}
