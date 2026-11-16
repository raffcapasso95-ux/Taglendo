import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ScaledFrame } from "@/components/marketing/ScaledFrame";
import styles from "@/components/marketing/Saloni.module.css";
import { PublicPage } from "@/components/salon/PublicPage";
import { cx } from "@/components/ui/cx";
import { emailCopy, reminderEmailCopy, staffCopy } from "@/lib/copy/emails";
import { saloniCopy } from "@/lib/copy/saloni";
import { DEMO_SALON } from "@/lib/demo/salon";
import { company } from "@/lib/site";

const copy = saloniCopy.functions;
const TITLE = "Funzioni · Taglendo per i saloni";
const DESCRIPTION = "Agenda per barbiere, pagina del salone, prenotazioni online con conferma via email e accesso per ogni barbiere. Tutto incluso durante la beta.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/per-i-saloni/funzioni" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", locale: "it_IT", siteName: "Taglendo", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Taglendo" }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
};

const Icon = ({ size = 18, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const Tick = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

type Item = { b: string; n: string };
const Checks = ({ items }: { items: readonly Item[] }) => (
  <ul className={styles.fl}>
    {items.map((it) => (
      <li key={it.b}>
        <span className={styles.ck}>
          <Tick />
        </span>
        <span>
          <b>{it.b}</b> {it.n ? <span className={styles.fmuted}>{it.n}</span> : null}
        </span>
      </li>
    ))}
  </ul>
);

/** Le quattro email, con gli oggetti veri dei testi dell'app (lib/copy/emails.ts). */
const MAILS = [
  { time: "09:12", to: "client", subject: emailCopy.code.subject("482 913"), text: "Inseriscilo per confermare la prenotazione." },
  { time: "09:13", to: "client", subject: emailCopy.confirmed.subject("sabato 14 novembre alle 9:30"), text: "Taglio uomo con Chiara · Via Roma 77, Torino" },
  { time: "09:13", to: "you", subject: staffCopy.newBooking.subject("Gianni Ferraro", "sab 9:30"), text: "Taglio uomo con Chiara. È già in agenda." },
  { time: "ven 18:00", to: "client", subject: reminderEmailCopy.subject("Barberia Porta Nuova", "9:30"), text: "A domani, Gianni. Non riesci a venire? Annulla dal link." },
] as const;

export default function Page() {
  const b = copy.blocks;
  return (
    <>
      {/* 1 · Apertura */}
      <section className={styles.fhero} aria-labelledby="funzioni-t">
        <div className={cx(styles.wrap, styles.fheroGrid)}>
          <div className={styles.fheroText}>
            <Link href="/per-i-saloni" className={styles.crumbBack}>
              <Icon size={16}>
                <path d="m15 6-6 6 6 6" />
              </Icon>
              {copy.back}
            </Link>
            <p className={styles.label}>{copy.kicker}</p>
            <h1 className={styles.fh1} id="funzioni-t">
              {copy.title}
            </h1>
            <p className={cx(styles.muted, styles.flead)}>{copy.lead}</p>
          </div>
          <div className={styles.hart} aria-hidden="true">
            <div className={styles.hdesk}>
              <Image src="/images/shot-agenda-d.jpg" alt="" width={1400} height={900} sizes="(min-width: 961px) 640px, 100vw" priority />
            </div>
            <div className={styles.hphone}>
              <div className={styles.hphoneBody}>
                <div className={styles.hphoneScreen}>
                  <Image src="/images/shot-prenota-p.jpg" alt="" width={900} height={1900} sizes="190px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 · Le sezioni della pagina */}
      <nav className={styles.subnav} aria-label={copy.sections}>
        <div className={styles.wrap}>
          <div className={styles.subin}>
            {copy.nav.map((n) => (
              <a key={n.id} href={`#${n.id}`}>
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* 3 · Quattro blocchi */}
      <div className={cx(styles.wrap, styles.blocks)}>
        <section id="agenda" className={cx(styles.fsec, styles.bgCream)} aria-labelledby="agenda-t">
          <div className={styles.ftext}>
            <p className={styles.label}>{b.agenda.label}</p>
            <h2 className={cx(styles.h2, styles.h2Block)} id="agenda-t">
              {b.agenda.title}
            </h2>
            <p className={cx(styles.muted, styles.blockLead)}>{b.agenda.lead}</p>
            <Checks items={b.agenda.list} />
          </div>
          <div className={styles.fvis}>
            <div className={cx(styles.shot, styles.hideM)}>
              <Image src="/images/shot-agenda-d.jpg" alt={copy.desktopAlt} width={1400} height={900} sizes="(min-width: 961px) 640px, 100vw" />
            </div>
            <div className={cx(styles.phones, styles.showM)}>
              <div className={styles.fphone}>
                <div className={styles.fphoneScreen}>
                  <Image src="/images/shot-agenda-p.jpg" alt={copy.phoneAlt} width={900} height={1900} sizes="240px" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pagina" className={cx(styles.fsec, styles.bgPlum)} aria-labelledby="pagina-t">
          <div className={styles.ftext}>
            <p className={cx(styles.label, styles.labelPeach)}>{b.pagina.label}</p>
            <h2 className={cx(styles.h2, styles.h2Block)} id="pagina-t">
              {b.pagina.title}
            </h2>
            <p className={cx(styles.blockLead, styles.leadOnPlum)}>{b.pagina.lead}</p>
            <Checks items={b.pagina.list} />
          </div>
          <div className={styles.fvis}>
            <div className={cx(styles.shot, styles.shotMini)}>
              <ScaledFrame>
                <PublicPage salon={DEMO_SALON} weekday={6} nowMin={15 * 60} today="2026-11-14" bookingOn preview />
              </ScaledFrame>
            </div>
          </div>
        </section>

        <section id="prenotazioni" className={cx(styles.fsec, styles.bgPeach)} aria-labelledby="prenotazioni-t">
          <div className={styles.ftext}>
            <p className={styles.label}>{b.prenotazioni.label}</p>
            <h2 className={cx(styles.h2, styles.h2Block)} id="prenotazioni-t">
              {b.prenotazioni.title}
            </h2>
            <p className={cx(styles.muted, styles.blockLead)}>{b.prenotazioni.lead}</p>
            <Checks items={b.prenotazioni.list} />
          </div>
          <div className={styles.fvis}>
            <ul className={styles.mails} aria-label={b.prenotazioni.mails}>
              {MAILS.map((m, i) => (
                <li key={m.subject} className={styles.mail} style={{ "--i": i } as React.CSSProperties}>
                  <Image src="/brand/taglendo-icon.svg" alt="" width={36} height={36} />
                  <div className={styles.mailBody}>
                    <div className={styles.mailTop}>
                      <span className={styles.muted}>
                        {DEMO_SALON.name} · <span className={cx(styles.who, m.to === "you" && styles.whoMe)}>{m.to === "you" ? b.prenotazioni.toYou : b.prenotazioni.toClient}</span>
                      </span>
                      <span className={cx(styles.muted, styles.num)}>{m.time}</span>
                    </div>
                    <b className={styles.mailSubject}>{m.subject}</b>
                    <span className={cx(styles.muted, styles.mailText)}>{m.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="team" className={cx(styles.fsec, styles.bgMint)} aria-labelledby="team-t">
          <div className={styles.ftext}>
            <p className={styles.label}>{b.team.label}</p>
            <h2 className={cx(styles.h2, styles.h2Block)} id="team-t">
              {b.team.title}
            </h2>
            <p className={cx(styles.muted, styles.blockLead)}>{b.team.lead}</p>
            <Checks items={b.team.list} />
          </div>
          <div className={styles.fvis}>
            <div className={styles.perm}>
              <table>
                <caption>{b.team.table}</caption>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className={styles.vh}>{b.team.table}</span>
                    </th>
                    <th scope="col">{b.team.owner}</th>
                    <th scope="col">{b.team.barbers}</th>
                  </tr>
                </thead>
                <tbody>
                  {b.team.rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row">{r.label}</th>
                      <td>
                        <span className={styles.yes}>
                          <Tick />
                          <span className={styles.vh}>{b.team.yes}</span>
                        </span>
                      </td>
                      <td>
                        {r.barber === true ? (
                          <span className={styles.yes}>
                            <Tick />
                            <span className={styles.vh}>{b.team.yes}</span>
                          </span>
                        ) : r.barber === "opt" ? (
                          <span className={styles.opt}>{b.team.optional}</span>
                        ) : (
                          <span className={styles.no}>
                            —<span className={styles.vh}>{b.team.no}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* 4 · E tutto il resto: domande sulle impostazioni */}
      <section className={styles.restSection} id="tutto" aria-labelledby="tutto-t">
        <div className={cx(styles.wrap, styles.restGrid)}>
          <div>
            <h2 className={styles.h2} id="tutto-t">
              {copy.rest.title}
            </h2>
            <p className={cx(styles.muted, styles.restLead)}>{copy.rest.lead}</p>
            <p className={styles.restMore}>
              {copy.rest.notFound} <a href={`mailto:${company.email}`}>{copy.rest.write}</a>
            </p>
          </div>
          <div className={styles.faq}>
            {copy.rest.items.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>
                  {f.q}
                  <span className={styles.plus} aria-hidden="true">
                    <Icon>
                      <path d="M12 5v14M5 12h14" />
                    </Icon>
                  </span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 5 · Cosa Taglendo non fa */}
      <section className={styles.notSection} id="nonfa" aria-labelledby="nonfa-t">
        <div className={styles.wrap}>
          <div className={styles.nobox}>
            <div>
              <h2 className={cx(styles.h2, styles.h2Block)} id="nonfa-t">
                {copy.not.title}
              </h2>
              <p className={cx(styles.muted, styles.notLead)}>{copy.not.lead}</p>
            </div>
            <ul className={styles.nogrid}>
              {copy.not.items.map((n) => (
                <li key={n.b} className={styles.nof}>
                  <b>{n.b}</b>
                  <p>{n.t}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 6 · Chiusura */}
      <section className={styles.finalSection} id="inizia" aria-labelledby="funzioni-fine-t">
        <div className={styles.wrap}>
          <div className={styles.final}>
            <div>
              <h2 className={cx(styles.h2, styles.finalTitle)} id="funzioni-fine-t">
                {copy.final.title}
              </h2>
              <p className={styles.finalText}>{copy.final.text}</p>
            </div>
            <div className={styles.ctas}>
              <Link href="/registrati" className={styles.btnLight}>
                {copy.final.cta}
              </Link>
              <Link href="/per-i-saloni#domande" className={styles.btnGhost}>
                {copy.final.faq}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
