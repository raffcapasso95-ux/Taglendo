import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getAccount } from "@/components/marketing/AuthLinks";
import { HeroNotice } from "@/components/marketing/HeroNotice";
import { NotebookCompare } from "@/components/marketing/NotebookCompare";
import { PagePreview } from "@/components/marketing/PagePreview";
import { PriceCountdown } from "@/components/marketing/PriceCountdown";
import styles from "@/components/marketing/Saloni.module.css";
import { PublicPage } from "@/components/salon/PublicPage";
import { cx } from "@/components/ui/cx";
import { saloniCopy as copy } from "@/lib/copy/saloni";
import { marketingCopy } from "@/lib/copy/marketing";
import { DEMO_SALON } from "@/lib/demo/salon";
import { company, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: marketingCopy.meta.title,
  description: marketingCopy.meta.description,
  alternates: { canonical: "/per-i-saloni" },
  openGraph: { title: marketingCopy.meta.title, description: marketingCopy.meta.description, type: "website", locale: "it_IT", siteName: "Taglendo", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Taglendo, la tua agenda online sempre in tasca" }] },
  twitter: { card: "summary_large_image", title: marketingCopy.meta.title, description: marketingCopy.meta.description, images: ["/og.png"] },
};

const Icon = ({ size = 18, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const MOMENT_ICONS = [
  <Icon key="notte">
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
  </Icon>,
  <Icon key="giorno">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
  </Icon>,
  <Icon key="barbiere">
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" />
  </Icon>,
  <Icon key="sera">
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>,
];

/** Chi è già dentro non deve vedere «Prova gratis»: lo salutiamo e lo mandiamo all'agenda. */
async function HeroCtas() {
  const account = await getAccount();
  if (account) {
    const first = account.name.split(" ")[0] || account.name;
    return (
      <>
        <div className={styles.ctas}>
          <Link href="/agenda" className={styles.btnLight}>
            {marketingCopy.account.heroCta}
          </Link>
        </div>
        <p className={cx(styles.note, styles.hello)}>
          <strong>{marketingCopy.account.heroHello(first)}</strong>
          {account.salonName ? <span>{account.salonName}</span> : null}
        </p>
      </>
    );
  }
  return <GuestCtas />;
}

function GuestCtas() {
  return (
    <>
      <div className={styles.ctas}>
        <Link href="/registrati" className={styles.btnLight}>
          {copy.hero.cta}
        </Link>
        <Link href="#come" className={styles.btnGhost}>
          {copy.hero.how}
        </Link>
      </div>
      <p className={styles.note}>{copy.hero.note}</p>
    </>
  );
}

export default function Page() {
  const host = siteUrl().replace(/^https?:\/\//, "");
  return (
    <>
      {/* 1 · Apertura: titolo, due righe di rassicurazione e il telefono con l'agenda vera */}
      <section className={styles.hero} data-land-hero="" aria-labelledby="saloni-t">
        <Image src="/images/foto/barbiere-sfumatura.jpg" alt="" fill priority sizes="100vw" className={styles.heroBg} />
        <div className={styles.heroScrim} aria-hidden="true" />
        <div className={cx(styles.wrap, styles.heroGrid)}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>{copy.hero.kicker}</p>
            <h1 className={styles.h1} id="saloni-t">
              {copy.hero.title}{" "}
              <span className={styles.accent}>{copy.hero.accent}</span>
            </h1>
            <p className={styles.lead}>{copy.hero.lead}</p>
            <Suspense fallback={<GuestCtas />}>
              <HeroCtas />
            </Suspense>
          </div>
          <div className={styles.heroArt}>
            <div className={styles.phoneBack} aria-hidden="true">
              <div className={styles.screen}>
                <Image src="/images/shot-salone-p.jpg" alt="" width={900} height={1900} sizes="230px" />
              </div>
            </div>
            <div className={styles.phoneFront}>
              <div className={styles.screen}>
                <Image src="/images/shot-agenda-p.jpg" alt={copy.hero.agendaAlt} width={900} height={1900} priority sizes="300px" />
                <HeroNotice />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 · Una giornata qualunque */}
      <section className={styles.sectionTop} aria-labelledby="giornata-t">
        <div className={styles.wrap}>
          <div className={styles.dayHead}>
            <h2 className={cx(styles.h2, styles.dayTitle)} id="giornata-t">
              {copy.day.title}
            </h2>
            <p className={cx(styles.muted, styles.dayLead)}>{copy.day.lead}</p>
          </div>
          <ol className={styles.day} data-reveal="">
            <span className={styles.rail} aria-hidden="true" />
            {copy.day.stops.map((s, i) => (
              <li key={s.time} className={cx(styles.stop, i === 0 && styles.stopNight)} style={{ "--d": `${i * 120}ms` } as React.CSSProperties}>
                <span className={styles.tick} aria-hidden="true" />
                <span className={styles.time}>
                  <b className={styles.num}>{s.time}</b>
                  {MOMENT_ICONS[i]}
                </span>
                <b className={styles.stopTitle}>{s.title}</b>
                <span className={styles.stopText}>{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3 · Pronto in tre passi: schermate vere */}
      <section className={styles.section} id="come" aria-labelledby="passi-t">
        <div className={styles.wrap}>
          <div className={styles.stepsHead}>
            <h2 className={styles.h2} id="passi-t">
              {copy.steps.title}
            </h2>
            <p className={cx(styles.muted, styles.stepsLead)}>{copy.steps.lead}</p>
          </div>
          <ol className={styles.three}>
            {copy.steps.items.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <div className={cx(styles.stepBox, [styles.tonePeach, styles.tonePlum, styles.toneMint][i])}>
                  <div className={styles.miniPhone}>
                    <div className={styles.screen}>
                      <Image src={s.img} alt={s.alt} width={900} height={1900} sizes="236px" />
                    </div>
                  </div>
                </div>
                <div>
                  <span className={cx(styles.stepNum, styles.num)}>{String(i + 1).padStart(2, "0")}</span>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepText}>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4 · La pagina della tua barberia: la pagina vera, in una finestra */}
      <section className={cx(styles.section, styles.dark)} id="pagina" aria-labelledby="pagina-t">
        <div className={styles.wrap}>
          <div className={styles.pageHead}>
            <div>
              <h2 className={styles.h2} id="pagina-t">
                {copy.page.title}
              </h2>
              <p className={styles.pageLead}>{copy.page.lead}</p>
            </div>
            <Link href="/barberia-saragozza" className={styles.btnLight}>
              {copy.page.example}
            </Link>
          </div>
          <PagePreview host={host}>
            <PublicPage salon={DEMO_SALON} weekday={6} nowMin={15 * 60} today="2026-11-14" bookingOn preview />
          </PagePreview>
          <div className={styles.pnote}>
            <p>{copy.page.note}</p>
            <Link href="/per-i-saloni/funzioni">
              {copy.page.all}
              <Icon size={18}>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </Icon>
            </Link>
          </div>
        </div>
      </section>

      {/* 5 · Il quaderno, e poi Taglendo */}
      <section className={styles.section} aria-labelledby="quaderno-t">
        <div className={styles.wrap}>
          <div className={styles.compareHead}>
            <h2 className={styles.h2} id="quaderno-t">
              {copy.notebook.title}
            </h2>
            <p className={cx(styles.muted, styles.compareLead)}>{copy.notebook.lead}</p>
          </div>
          <NotebookCompare />
        </div>
      </section>

      {/* 6 · Quanto costa: il contatore da 29 € a 0 € */}
      <section className={styles.costSection} id="costo" aria-labelledby="costo-t">
        <div className={styles.wrap}>
          <div className={styles.cost}>
            <div>
              <h2 className={styles.h2} id="costo-t">
                {copy.cost.title}
              </h2>
              <PriceCountdown />
              <p className={styles.costLead}>{copy.cost.lead}</p>
            </div>
            <div className={styles.costList}>
              <ul className={styles.costItems}>
                {copy.cost.list.map((c) => (
                  <li key={c.name}>
                    <span>{c.name}</span>
                    <span className={styles.dots} aria-hidden="true" />
                    <b className={styles.num}>{c.value}</b>
                  </li>
                ))}
              </ul>
              <Link href="/registrati" className={cx(styles.btnDark, styles.costCta)}>
                {copy.cost.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7 · Domande frequenti */}
      <section className={styles.faqSection} id="domande" aria-labelledby="domande-t">
        <div className={cx(styles.wrap, styles.faqGrid)}>
          <div>
            <h2 className={styles.h2} id="domande-t">
              {copy.faq.title}
            </h2>
            <p className={cx(styles.muted, styles.faqMore)}>
              {copy.faq.more} <a href={`mailto:${company.email}`}>{company.email}</a>. {copy.faq.reply}
            </p>
          </div>
          <div className={styles.faq}>
            {copy.faq.items.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>
                  {f.q}
                  <span className={styles.plus} aria-hidden="true">
                    <Icon size={18}>
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

      {/* 8 · Chiusura */}
      <section className={styles.finalSection} id="inizia" aria-labelledby="chiusura-t">
        <div className={styles.wrap}>
          <div className={styles.final}>
            <div>
              <h2 className={cx(styles.h2, styles.finalTitle)} id="chiusura-t">
                {copy.final.title}
              </h2>
              <p className={styles.finalText}>{copy.final.text}</p>
            </div>
            <Link href="/registrati" className={styles.btnLight}>
              {copy.final.cta}
            </Link>
          </div>
        </div>
      </section>

      {/* Telefono: barra fissa in basso */}
      <div className={styles.mbar} data-land-bar="" data-hidden="true">
        <span className={styles.mbarText}>
          <b>{copy.bar.main}</b>
          <span>{copy.bar.sub}</span>
        </span>
        <Link href="/registrati" className={styles.btnDark}>
          {copy.bar.cta}
        </Link>
      </div>
    </>
  );
}
