"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, ToastProvider, useToast } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import settings from "@/components/settings/Settings.module.css";
import styles from "./Link.module.css";

type Props = {
  salonName: string;
  url: string;
  prices: boolean;
  bookingOnline: boolean;
  cancelLabel: string;
  isOwner: boolean;
};

const Svg = ({ children }: { children: ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

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

  const rows: Array<{ label: string; value: string; ok?: boolean; tone: 1 | 2 | 3; icon: ReactNode }> = [
    { label: "Prenotazione online", value: bookingOnline ? "Attiva" : "Solo telefono", ok: bookingOnline, tone: 1, icon: <path d="m5 12 5 5 9-10" /> },
    {
      label: "Annullamento online",
      value: !bookingOnline ? "Solo telefono" : cancelLabel,
      tone: 2,
      icon: (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </>
      ),
    },
    { label: "Spostamenti", value: "Al telefono, col salone", tone: 3, icon: <path d="M5 4h3l1.5 4-2 1.3a11 11 0 0 0 7.2 7.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /> },
  ];
  const ideas: Array<{ label: string; sub: string; icon: ReactNode }> = [
    {
      label: "Nella bio di Instagram",
      sub: "Chi ti segue prenota senza scriverti",
      icon: (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <path d="M17 7h.01" />
        </>
      ),
    },
    { label: "Nel profilo WhatsApp Business", sub: "Come risposta automatica quando sei occupato", icon: <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5z" /> },
    {
      label: "Su Google Maps",
      sub: "Nel campo «Prenotazioni» della scheda del salone",
      icon: (
        <>
          <path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </>
      ),
    },
  ];

  return (
    <main className={cx(styles.page, settings.page)}>
      <header className={settings.headBlock}>
        <p className={styles.eyebrow}>Prenotazioni dirette</p>
        <h1 className={styles.title}>Il tuo link</h1>
        <p className={styles.intro}>
          {bookingOnline
            ? `I clienti vedono solo il tuo salone: servizi, ${prices ? "prezzi " : ""}e orari davvero liberi. Nessun marketplace, nessun nome di altri clienti.`
            : "Prenotazione online disattivata: il link mostra servizi, prezzi e orari, con il pulsante per chiamarti."}
        </p>
      </header>

      <section className={settings.linkCard} aria-label="Indirizzo della pagina">
        <div className={settings.linkTop}>
          <Image className={settings.linkLogo} src="/brand/taglendo-icon.svg" alt="" width={44} height={44} />
          <div className={settings.text}>
            <span className={settings.linkSalon}>{salonName}</span>
            <span className={settings.linkUrl} data-testid="salon-url">
              {shown}
            </span>
          </div>
        </div>
        <div className={settings.linkActions}>
          <Button variant="accent" size="large" className={settings.linkMain} onClick={copy}>
            <Svg>
              <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
              <path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
            </Svg>
            {copied ? "✓ Link copiato" : "Copia link"}
          </Button>
          <button type="button" className={settings.linkSecondary} onClick={share}>
            <Svg>
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="18" cy="6" r="2.5" />
              <circle cx="18" cy="18" r="2.5" />
              <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
            </Svg>
            Condividi su WhatsApp o Instagram
          </button>
          <a className={settings.linkSecondary} href={url} target="_blank" rel="noopener noreferrer">
            <Svg>
              <path d="M14 4h6v6M20 4l-9 9" />
              <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
            </Svg>
            Apri la tua pagina
          </a>
        </div>
      </section>

      <section className={settings.section} aria-labelledby="lk-regole">
        <h2 className={settings.title} id="lk-regole">
          Regole attive
        </h2>
        <div className={settings.group}>
          {rows.map((r) => (
            <div key={r.label} className={cx(settings.row, settings.rowStatic)}>
              <span className={cx(settings.icon, settings[`t${r.tone}` as "t1"])}>
                <Svg>{r.icon}</Svg>
              </span>
              <span className={settings.text}>
                <span className={settings.label}>{r.label}</span>
              </span>
              <strong className={cx(settings.value, r.ok && settings.valueOk)}>{r.value}</strong>
            </div>
          ))}
          {isOwner ? (
            <Link href="/impostazioni" className={cx(settings.row, settings.rowLink)}>
              <span className={settings.text}>
                <span className={settings.label}>Cambia le regole in Impostazioni</span>
              </span>
              <span className={settings.chev} aria-hidden="true">
                ›
              </span>
            </Link>
          ) : null}
        </div>
      </section>

      <section className={settings.section} aria-labelledby="lk-idee">
        <h2 className={settings.title} id="lk-idee">
          Dove metterlo
        </h2>
        <ul className={cx(settings.group, settings.ideas)}>
          {ideas.map((i) => (
            <li key={i.label} className={settings.idea}>
              <span className={cx(settings.icon, settings.t0)}>
                <Svg>{i.icon}</Svg>
              </span>
              <span className={settings.text}>
                <span className={settings.label}>{i.label}</span>
                <span className={settings.sub}>{i.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
