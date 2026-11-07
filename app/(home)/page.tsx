import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { BeforeAfter } from "@/components/marketing/BeforeAfter";
import { ModeSwitch } from "@/components/marketing/ModeSwitch";
import { PhoneDemo } from "@/components/marketing/PhoneDemo";
import { Ticker } from "@/components/marketing/Ticker";
import { PricingPlans } from "@/components/marketing/PricingPlans";
import { cx } from "@/components/ui/cx";
import styles from "@/components/marketing/Land.module.css";
import marketing from "@/components/marketing/Marketing.module.css";
import { billingEnabled } from "@/lib/billing";
import { landCopy as copy } from "@/lib/copy/land";
import { marketingCopy } from "@/lib/copy/marketing";

export const metadata: Metadata = {
  title: marketingCopy.meta.title,
  description: marketingCopy.meta.description,
  alternates: { canonical: "/" },
  openGraph: { title: marketingCopy.meta.title, description: marketingCopy.meta.description, type: "website", locale: "it_IT", siteName: "Taglendo", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Taglendo, la tua agenda online sempre in tasca" }] },
  twitter: { card: "summary_large_image", title: marketingCopy.meta.title, description: marketingCopy.meta.description, images: ["/og.png"] },
};

const Icon = ({ size = 18, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const Arrow = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

/** Le parole del titolo entrano una dopo l'altra: --i è il turno di ciascuna. */
function Words({ words, from }: { words: readonly string[]; from: number }) {
  return words.map((w, i) => (
    <Fragment key={w}>
      <span className={styles.w} style={{ "--i": from + i } as React.CSSProperties}>
        {w}
      </span>{" "}
    </Fragment>
  ));
}

export default function Page() {
  const live = billingEnabled();
  const p = copy.prices;
  const faq = marketingCopy.faq.items(!live);
  const stops = marketingCopy.stops.items;

  return (
    <>
      <section className={styles.hero} id="top" data-land-hero="">
        <Image src="/images/foto/hero.jpg" alt="" width={1600} height={2409} priority sizes="100vw" className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <p className={cx(styles.kicker, styles.rise)} style={{ "--i": 0 } as React.CSSProperties}>
              {copy.hero.kicker}
            </p>
            <h1 className={styles.h1}>
              <span className={styles.line}>
                <Words words={copy.hero.lines[0]} from={1} />
              </span>
              <span className={styles.line}>
                <Words words={copy.hero.lines[1]} from={4} />
                <span className={styles.accent}>
                  <Words words={copy.hero.accent} from={5} />
                </span>
              </span>
              <span className={styles.line}>
                <span className={cx(styles.accent, styles.hl)}>
                  <Words words={copy.hero.scribbled} from={6} />
                  <svg className={styles.scribble} viewBox="0 0 200 18" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M3 12 C 40 4, 90 3, 130 7 S 185 13, 197 6" />
                  </svg>
                </span>
              </span>
            </h1>
            <p className={cx(styles.lead, styles.rise)} style={{ "--i": 8 } as React.CSSProperties}>
              {copy.hero.lead}
            </p>
            <div className={cx(styles.heroCta, styles.rise)} style={{ "--i": 9 } as React.CSSProperties}>
              <Link className={cx(styles.btn, styles.btnLight)} href="#inizia">
                {copy.hero.cta} <Arrow />
              </Link>
              <span className={styles.heroNote}>
                <strong>{live ? copy.hero.noteLive : copy.hero.noteBeta}</strong>
                <span>{live ? copy.hero.noteLiveSub : copy.hero.noteBetaSub}</span>
              </span>
            </div>
          </div>
          <div className={cx(styles.heroDemo, styles.rise)} style={{ "--i": 6 } as React.CSSProperties}>
            <div className={styles.phone}>
              <div className={styles.phoneScreen}>
                <PhoneDemo title={copy.hero.phoneTitle} />
              </div>
            </div>
          </div>
        </div>
        <a className={styles.scrollHint} href="#come" aria-label={copy.hero.scroll}>
          <Icon size={22}>
            <path d="m6 9 6 6 6-6" />
          </Icon>
        </a>
      </section>

      <div className={styles.tape} aria-label={copy.tape.label}>
        <div className={styles.tapeTrack}>
          {[0, 1].map((g) => (
            <div key={g} className={styles.tapeGroup} aria-hidden={g === 1 || undefined}>
              {copy.tape.items.map((t) => (
                <span key={t} className={styles.tapeItem}>
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section id="come" className={cx(styles.section, styles.come)} aria-labelledby="come-t">
        <div className={styles.wrap}>
          <div className={cx(styles.head, styles.headRow, styles.reveal)} data-reveal="">
            <div>
              <p className={styles.eyebrow}>{copy.how.eyebrow}</p>
              <h2 className={styles.h2} id="come-t">
                {copy.how.title}
              </h2>
            </div>
            <p className={styles.p}>{copy.how.lead}</p>
          </div>
          <ol className={styles.steps}>
            {copy.how.steps.map((s, i) => (
              <li key={s.n} className={cx(styles.step, styles.reveal)} style={{ "--i": i } as React.CSSProperties} data-reveal="">
                <div className={styles.stepHead}>
                  <span className={styles.stepNum}>{s.n}</span>
                  <span className={styles.stepLine} aria-hidden="true" />
                </div>
                <h3 className={styles.h3}>{s.t}</h3>
                <p className={styles.p}>{s.d}</p>
                <div className={styles.stepShot}>
                  <Image src={s.img} alt={s.alt} width={780} height={1688} sizes="(min-width: 820px) 300px, 70vw" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="prima" className={cx(styles.section, styles.primaSec)} aria-labelledby="prima-t">
        <div className={styles.wrap}>
          <div className={cx(styles.head, styles.reveal)} data-reveal="">
            <p className={styles.eyebrow}>{copy.before.eyebrow}</p>
            <h2 className={styles.h2} id="prima-t">
              {copy.before.title}
            </h2>
            <p className={styles.p}>{copy.before.lead}</p>
          </div>
          <div className={styles.reveal} data-reveal="">
            <BeforeAfter extra={{ root: cx(styles.compare, styles.Marketing_compare), paper: styles.Marketing_paper, handle: styles.handle, tagLeft: styles.tagLeft, tagRight: styles.tagRight }} />
          </div>
        </div>
      </section>

      <section className={cx(styles.section, styles.dark)} aria-labelledby="cambia-t">
        <div className={styles.wrap}>
          <div className={cx(styles.head, styles.reveal)} data-reveal="">
            <p className={cx(styles.eyebrow, styles.eyebrowLight)}>{copy.stops.eyebrow}</p>
            <h2 className={styles.h2} id="cambia-t">
              {copy.stops.title}
            </h2>
          </div>
          <ul className={styles.stops}>
            {stops.map((s) => (
              <li key={s.old} className={cx(styles.stop, styles.reveal)} data-reveal="">
                <div className={styles.stopImgBox}>
                  <Image src={s.img} alt={s.alt} width={900} height={675} className={styles.stopImg} sizes="(min-width: 820px) 33vw, 100vw" />
                </div>
                <div className={styles.stopText}>
                  <span className={styles.stopLabel}>{copy.stops.before}</span>
                  <p className={styles.stopOld}>
                    <span className={styles.strike}>{s.old}</span>
                  </p>
                  <span className={cx(styles.stopLabel, styles.stopLabelNow)}>
                    <Icon size={16}>
                      <path d="m5 12 5 5 9-10" />
                    </Icon>
                    {copy.stops.with}
                  </span>
                  <p className={styles.stopNow}>{s.now}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="modalita" className={styles.section} aria-labelledby="modalita-t">
        <div className={cx(styles.wrap, styles.modeGrid)}>
          <ModeSwitch />
        </div>
      </section>

      <section id="prezzi" className={styles.section} aria-labelledby="prezzi-t">
        <div className={cx(styles.wrap, styles.priceGrid)}>
          <div className={cx(styles.priceText, styles.reveal)} data-reveal="">
            <p className={styles.eyebrow}>{p.eyebrow}</p>
            {live ? null : (
              <p className={styles.bigPrice} aria-hidden="true">
                <Ticker from={29} className={styles.ticker} />
                <span className={styles.bigEuro}>€</span>
              </p>
            )}
            <h2 className={styles.h2} id="prezzi-t">
              {live ? marketingCopy.prices.titleLive : p.title}
            </h2>
            {live ? null : (
              <>
                <p className={styles.p}>{p.leadOne}</p>
                <p className={styles.p}>{p.leadTwo}</p>
                <p className={styles.p}>{p.leadThree}</p>
              </>
            )}
            <Link className={styles.btn} href="/registrati">
              {p.cta} <Arrow />
            </Link>
          </div>
          {live ? (
            <div className={cx(styles.board, styles.reveal)} data-reveal="">
              <PricingPlans />
            </div>
          ) : (
            <div className={cx(styles.board, styles.reveal)} data-reveal="">
              <p className={styles.boardTitle}>{p.board}</p>
              <ul className={styles.items}>
                {p.items.map((it) => (
                  <li key={it.n} className={styles.item}>
                    <span className={styles.itemName}>
                      {it.n}
                      {it.s ? <span className={styles.itemSub}>{it.s}</span> : null}
                    </span>
                    <span className={styles.dots} aria-hidden="true" />
                    <span className={styles.itemPrice}>{it.p}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.total}>
                <span>{p.total}</span>
                <span className={styles.dots} aria-hidden="true" />
                <strong>{p.totalValue}</strong>
              </p>
            </div>
          )}
        </div>
      </section>

      <section id="domande" className={styles.section} aria-labelledby="domande-t">
        <div className={cx(styles.wrap, styles.faqGrid)}>
          <div className={cx(styles.head, styles.reveal)} data-reveal="">
            <p className={styles.eyebrow}>{copy.faq.eyebrow}</p>
            <h2 className={styles.h2} id="domande-t">
              {copy.faq.title}
            </h2>
            <p className={styles.p}>
              {copy.faq.more} <a href="mailto:aiuto@taglendo.it">aiuto@taglendo.it</a>.
            </p>
          </div>
          <div className={cx(marketing.faqList, styles.faqList, styles.reveal)} data-reveal="">
            {faq.map((q) => (
              <details key={q.q} className={marketing.faqItem}>
                <summary className={marketing.faqQuestion}>
                  <span>{q.q}</span>
                  <span className={marketing.chev} aria-hidden="true">
                    <Icon>
                      <path d="M12 5v14M5 12h14" />
                    </Icon>
                  </span>
                </summary>
                <p className={marketing.faqAnswer}>{q.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="inizia" className={styles.startSec} aria-labelledby="inizia-t">
        <div className={styles.wrap}>
          <div className={cx(styles.startCard, styles.reveal)} data-reveal="">
            <div className={styles.startText}>
              <p className={cx(styles.eyebrow, styles.eyebrowLight)}>{copy.start.eyebrow}</p>
              <h2 className={styles.startTitle} id="inizia-t">
                {copy.start.title}
                <span className={styles.startAccent}>{copy.start.accent}</span>
              </h2>
              <p className={styles.startLead}>{copy.start.lead}</p>
              <ul className={styles.checks}>
                {copy.start.checks.map((c) => (
                  <li key={c} className={styles.check}>
                    <Icon>
                      <path d="m5 12 5 5 9-10" />
                    </Icon>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.startCta}>
              <Link className={cx(styles.btn, styles.btnLight, styles.startBtn)} href="/registrati">
                {copy.start.cta} <Arrow />
              </Link>
              <p className={styles.startLogin}>
                {copy.start.login} <Link href="/accedi">{copy.start.loginLink}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.bar} data-land-bar="" data-hidden="true">
        <span className={styles.barText}>
          <span className={styles.barSub}>{copy.bar.sub}</span>
          <span className={styles.barMain}>{live ? copy.bar.mainLive : copy.bar.mainBeta}</span>
        </span>
        <Link className={cx(styles.btn, styles.btnSmall)} href="#inizia">
          {copy.bar.cta}
        </Link>
      </div>
    </>
  );
}
