import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BeforeAfter } from "@/components/marketing/BeforeAfter";
import { PricingPlans } from "@/components/marketing/PricingPlans";
import { Stop } from "@/components/marketing/Stop";
import styles from "@/components/marketing/Marketing.module.css";
import { billingEnabled } from "@/lib/billing";
import { marketingCopy as copy } from "@/lib/copy/marketing";

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
  alternates: { canonical: "/" },
  openGraph: { title: copy.meta.title, description: copy.meta.description, type: "website", locale: "it_IT", siteName: "Taglendo", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Taglendo, la tua agenda online sempre in tasca" }] },
  twitter: { card: "summary_large_image", title: copy.meta.title, description: copy.meta.description, images: ["/og.png"] },
};

const eyebrow = (text: string) => <span className={styles.eyebrow}>{text}</span>;

export default function Page() {
  const live = billingEnabled();
  const p = copy.prices;
  const faq = copy.faq.items(!live);

  return (
    <>
      <section className={styles.hero} id="top">
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <span className={styles.eyebrowDot}>
              <span className={styles.dot} />
              {copy.hero.eyebrow}
            </span>
            <h1 className={styles.h1}>
              {copy.hero.title}
              <span className={styles.underline}>{copy.hero.underlined}</span>
            </h1>
            <p className={styles.lead}>{copy.hero.lead}</p>
            <div className={styles.heroCta}>
              <Link href="#inizia" className={styles.buttonLarge}>{copy.hero.cta}</Link>
              <span className={styles.heroPrice}>
                <strong>{live ? copy.hero.priceLive : copy.hero.priceBeta}</strong>
                <span>{live ? copy.hero.subLive : copy.hero.subBeta}</span>
              </span>
            </div>
            <ol className={styles.flow} aria-label={copy.hero.flowLabel}>
              {copy.hero.flow.map((t, i) => (
                <li key={t} className={styles.flowItem}>
                  <span className={styles.flowStep}>
                    <span className={styles.flowNum}>{i + 1}</span>
                    {t}
                  </span>
                  {i < copy.hero.flow.length - 1 ? <span className={styles.flowArrow} aria-hidden="true">→</span> : null}
                </li>
              ))}
            </ol>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroPhotoBox}>
              <Image src="/images/foto/hero.jpg" alt={copy.hero.photoAlt} fill priority sizes="(min-width: 820px) 28vw, 64vw" className={styles.heroPhoto} />
            </div>
            <span className={styles.sticker}>{copy.hero.sticker}</span>
            <Image src="/images/shot-agenda-mobile.png" alt={copy.hero.phoneAlt} width={780} height={1688} priority className={styles.heroPhone} />
          </div>
        </div>
      </section>

      <section id="prima" className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitleBox}>
            {eyebrow(copy.before.eyebrow)}
            <h2 className={styles.h2}>{copy.before.title}</h2>
          </div>
          <p className={styles.sectionLead}>{copy.before.lead}</p>
        </div>
        <BeforeAfter />
      </section>

      <section id="come" className={styles.sectionBand}>
        <div className={styles.section}>
          <div className={styles.sectionTitleBox}>
            {eyebrow(copy.how.eyebrow)}
            <h2 className={styles.h2}>{copy.how.title}</h2>
          </div>
          <div className={styles.steps}>
            {copy.how.steps.map((s) => (
              <div key={s.n} className={`${styles.step} ${s.bg === "peach" ? styles.stepPeach : styles.stepMuted}`}>
                <div className={styles.stepText}>
                  <span className={styles.stepNum}>{s.n}</span>
                  <h3 className={styles.h3}>{s.t}</h3>
                  <p className={styles.muted}>{s.d}</p>
                </div>
                <div className={styles.stepShot}>
                  <Image src={s.img} alt={s.alt} width={780} height={1688} sizes="220px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modalita" className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitleBox}>
            {eyebrow(copy.modes.eyebrow)}
            <h2 className={styles.h2}>{copy.modes.title}</h2>
          </div>
          <p className={styles.sectionLead}>{copy.modes.lead}</p>
        </div>
        <div className={styles.modes}>
          <div className={styles.mode}>
            <div className={styles.modeText}>
              <h3 className={styles.h3}>{copy.modes.online.title}</h3>
              <p className={styles.muted}>{copy.modes.online.text}</p>
            </div>
            <div className={styles.sample} aria-hidden="true">
              <div className={styles.sampleRow}><span>{copy.modes.sample.service}</span><span>{copy.modes.sample.price}</span></div>
              <div className={styles.times}>
                {copy.modes.sample.times.map((t, i) => (
                  <span key={t} className={i === 1 ? styles.timeOn : styles.time}>{t}</span>
                ))}
              </div>
              <span className={styles.fakeButton}>{copy.modes.sample.book}</span>
            </div>
          </div>
          <div className={styles.mode}>
            <div className={styles.modeText}>
              <h3 className={styles.h3}>{copy.modes.phone.title}</h3>
              <p className={styles.muted}>{copy.modes.phone.text}</p>
            </div>
            <div className={styles.sample} aria-hidden="true">
              <div className={styles.sampleRow}><span>{copy.modes.sample.service}</span><span>{copy.modes.sample.price}</span></div>
              <div className={styles.callBox}>
                <span className={styles.callSmall}>{copy.modes.sample.callLabel}</span>
                <span className={styles.callNumber}>{copy.modes.sample.phone}</span>
              </div>
              <span className={styles.fakeButtonAccent}>{copy.modes.sample.call}</span>
            </div>
          </div>
        </div>
        <span className={styles.small}>{copy.modes.note}</span>
      </section>

      <section className={styles.dark}>
        <div className={styles.darkInner}>
          <div className={styles.darkHead}>
            <span className={styles.eyebrowApricot}>{copy.stops.eyebrow}</span>
            <h2 className={styles.h2}>{copy.stops.title}</h2>
          </div>
          {copy.stops.items.map((s, i) => (
            <Stop key={s.old} index={i} {...s} />
          ))}
        </div>
      </section>

      <section id="prezzi" className={styles.section}>
        {live ? (
          <>
            <div className={styles.sectionTitleBox}>
              {eyebrow(p.eyebrow)}
              <h2 className={styles.h2}>{p.titleLive}</h2>
            </div>
            <PricingPlans />
          </>
        ) : (
          <>
            <div className={styles.sectionTitleBox}>{eyebrow(p.eyebrow)}</div>
            <div className={styles.betaBox}>
              <div className={styles.betaText}>
                <h2 className={styles.betaTitle}>{p.beta.title}</h2>
                <p className={styles.betaLead}>{p.beta.lead}</p>
                <p className={styles.betaLead}>{p.beta.later}</p>
                <Link href="/registrati" className={`${styles.buttonLarge} ${styles.betaCta}`}>{p.beta.cta}</Link>
              </div>
              <div className={styles.betaRows}>
                {p.beta.points.map((r) => (
                  <div key={r.k} className={styles.betaRow}><span>{r.k}</span><strong>{r.v}</strong></div>
                ))}
              </div>
            </div>
          </>
        )}
        <div className={styles.included}>
          <div className={styles.includedHead}>
            {eyebrow(live ? p.includedEyebrow : p.includedEyebrowBeta)}
            <h3 className={styles.includedTitle}>{p.includedTitle}</h3>
            <p className={styles.includedNote}>{live ? p.includedNote : p.includedNoteBeta}</p>
          </div>
          <div className={styles.includedGrid}>
            {p.included.map((it, i) => (
              <div key={it.t} className={styles.includedItem}>
                <span className={styles.includedNum}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.includedText}>
                  <strong className={styles.includedName}>{it.t}</strong>
                  <span className={styles.muted}>{it.d}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="domande" className={styles.faq}>
        <h2 className={styles.faqTitle}>{copy.faq.title}</h2>
        <div className={styles.faqList}>
          {faq.map((q) => (
            <details key={q.q} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span>{q.q}</span>
                <span className={styles.chev} aria-hidden="true">+</span>
              </summary>
              <p className={styles.faqAnswer}>{q.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="inizia" className={styles.start}>
        <div className={styles.startBox}>
          <div className={styles.startText}>
            <h2 className={styles.startTitle}>{copy.start.title}</h2>
            <p className={styles.startLead}>{copy.start.lead}</p>
          </div>
          {/* Senza JavaScript funziona lo stesso: porta alla registrazione con l'email già scritta. */}
          <form action="/registrati" method="get" className={styles.form}>
            <label htmlFor="start-email" className={styles.formLabel}>{copy.start.label}</label>
            <div className={styles.formRow}>
              <input id="start-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" enterKeyHint="send" placeholder={copy.start.placeholder} required className={styles.input} />
              <button type="submit" className={styles.buttonLarge}>{copy.start.button}</button>
            </div>
            <span className={styles.formNote}>{live ? copy.start.noteLive : copy.start.noteBeta}</span>
          </form>
        </div>
      </section>

      <div className={styles.bar}>
        <span className={styles.barText}>
          <span className={styles.barSub}>{copy.bar.sub}</span>
          <span className={styles.barMain}>{live ? copy.bar.mainLive : copy.bar.mainBeta}</span>
        </span>
        <Link href="#inizia" className={styles.buttonLarge}>{copy.bar.cta}</Link>
      </div>
    </>
  );
}
