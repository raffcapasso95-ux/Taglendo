"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelBooking } from "@/lib/booking/manage-actions";
import { manageCopy as copy } from "@/lib/copy/manage";
import styles from "./Manage.module.css";

export type ManageProps = {
  slug: string;
  token: string;
  salonName: string;
  area: string | null;
  address: string | null;
  phone: string;
  telHref: string;
  mapsHref: string | null;
  /** "Venerdì 30 ottobre" */
  dayLong: string;
  /** "alle 10:30" */
  at: string;
  detail: string; // "Taglio e barba · 50 min · con Marco"
  price: string | null; // "30 €"
  code: string;
  calendarHref: string;
  /** "venerdì alle 8:30"; null se non si annulla online */
  cancelUntil: string | null;
  canCancel: boolean;
  cancelOnline: boolean;
  limitLabel: string; // "2 ore" | "24 ore"
  hoursLine: string;
  /** "venerdì 30 ottobre alle 10:30" */
  when: string;
  /** " con Marco", o vuoto con un solo barbiere */
  withWho: string;
};

/** E1 La tua prenotazione, E2 conferma, E3 annullata, E4 troppo tardi. */
export function ManageView(p: ManageProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "confirm" | "done">("view");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startCancel] = useTransition();

  const cancel = () =>
    startCancel(async () => {
      setError(null);
      try {
        const r = await cancelBooking({ slug: p.slug, token: p.token });
        if (r.ok) {
          setEmailSent(r.emailSent);
          return setMode("done");
        }
        if (r.reason === "error") return setError(r.error);
        router.refresh(); // troppo tardi, non più permesso o già annullata: la pagina si ridisegna
      } catch {
        setError(copy.errors.network);
      }
    });

  // E4: l'annullamento online c'è ma il limite è passato
  const late = p.cancelOnline && !p.canCancel;

  const header = (
    <header className={styles.head}>
      {p.area ? <span className={styles.area}>{p.area}</span> : null}
      <span className={styles.salon}>{p.salonName}</span>
      <span className={styles.contact}>{[p.address, p.phone].filter(Boolean).join(" · ")}</span>
    </header>
  );

  const summary = (
    <div className={styles.summary}>
      <span className={styles.eyebrow}>{copy.code(p.code)}</span>
      <span className={styles.when}>{p.dayLong}</span>
      <span className={styles.when}>{p.at}</span>
      <span className={styles.what}>{p.detail}</span>
      {p.price ? (
        <span className={styles.pay}>
          <span>{copy.payInShop}</span>
          <span>{p.price}</span>
        </span>
      ) : null}
    </div>
  );

  return (
    <div className={styles.page}>
      <main className={styles.wrap}>
        {header}
        <div className={styles.card}>
          {mode === "done" ? (
            <>
              <span className={styles.tick} aria-hidden="true">✓</span>
              <h1 className={styles.title}>{copy.doneTitle}</h1>
              <p className={styles.text}>{emailSent ? copy.doneText(p.when) : copy.doneTextNoMail(p.when)}</p>
              <div className={styles.actions}>
                <Link href={`/${p.slug}#prenota`} className={styles.primary}>{copy.again}</Link>
              </div>
            </>
          ) : (
            <>
              {late ? (
                <>
                  <h1 className={styles.title}>{copy.lateTitle}</h1>
                  <p className={styles.text}>{copy.lateText(p.limitLabel)}</p>
                </>
              ) : (
                <h1 className={styles.title}>{copy.title}</h1>
              )}
              {summary}
              {mode === "confirm" ? (
                <div className={styles.confirm} role="alertdialog" aria-labelledby="cancel-title">
                  <h2 id="cancel-title" className={styles.title}>{copy.confirmTitle}</h2>
                  <p className={styles.text}>{copy.confirmText(p.when, p.withWho)}</p>
                  {error ? <p className={styles.error} role="alert">{error}</p> : null}
                  <div className={styles.actions}>
                    <button type="button" className={styles.danger} disabled={pending} onClick={cancel}>{copy.yes}</button>
                    <button type="button" className={styles.secondary} disabled={pending} onClick={() => setMode("view")}>{copy.no}</button>
                  </div>
                </div>
              ) : (
                <div className={styles.actions}>
                  {p.canCancel ? (
                    <>
                      <a href={p.calendarHref} className={styles.secondary}>{copy.calendar}</a>
                      <button type="button" className={styles.secondary} onClick={() => setMode("confirm")}>{copy.cancel}</button>
                      <p className={styles.note}>{copy.cancelNote(p.cancelUntil ?? "")}</p>
                    </>
                  ) : (
                    <>
                      <a href={p.telHref} className={styles.primary}>{copy.callNumber(p.phone)}</a>
                      <a href={p.calendarHref} className={styles.secondary}>{copy.calendar}</a>
                      {p.cancelOnline ? null : <p className={styles.note}>{copy.phoneNote}</p>}
                    </>
                  )}
                </div>
              )}
              <div className={styles.info}>
                <span className={styles.infoLabel}>{copy.call}</span>
                <a href={p.telHref} className={styles.infoValue}>{p.phone}</a>
                {p.hoursLine ? <span className={styles.note}>{p.hoursLine}</span> : null}
              </div>
              {p.address ? (
                <div className={styles.info}>
                  <span className={styles.infoLabel}>{copy.where}</span>
                  <span className={styles.infoValue}>{p.address}</span>
                  {p.mapsHref ? <a href={p.mapsHref} target="_blank" rel="noopener noreferrer" className={styles.note}>{copy.map}</a> : null}
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className={styles.footer}>
          <span>{copy.poweredBy}</span>
          <Image src="/brand/taglendo-logo-light.svg" alt="Taglendo" width={84} height={26} style={{ height: "auto" }} />
        </div>
      </main>
    </div>
  );
}
