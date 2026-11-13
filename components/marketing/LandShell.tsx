import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LandEffects } from "@/components/marketing/LandEffects";
import { CookieConsent } from "@/components/salon/CookieConsent";
import { AccountMenu } from "@/components/marketing/AccountMenu";
import { getAccount } from "@/components/marketing/AuthLinks";
import { landCopy as copy } from "@/lib/copy/land";
import { searchCopy } from "@/lib/copy/search";
import { marketingCopy } from "@/lib/copy/marketing";
import { company, isPlaceholder } from "@/lib/site";
import styles from "@/components/marketing/Land.module.css";

const site = searchCopy.site;

const Arrow = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function Field({ value }: { value: string }) {
  return isPlaceholder(value) ? <span className={styles.fPlaceholder}>{value}</span> : <>{value}</>;
}

/** Chi è già dentro vede il tondo con le sue iniziali (menu con agenda, impostazioni, Esci), come in un'app. */
async function AuthActions({ audience }: { audience: Audience }) {
  const account = await getAccount();
  if (account) return <AccountMenu account={account} tone="dark" />;
  return <GuestActions audience={audience} />;
}

/** Ai saloni: «Accedi» e «Prova gratis». Ai clienti: «Hai un salone?» porta alla pagina per i barbieri. */
function GuestActions({ audience }: { audience: Audience }) {
  if (audience === "clienti") {
    return (
      <Link className={`${styles.btn} ${styles.btnSmall}`} href={SALONI}>
        {site.forSalons}
      </Link>
    );
  }
  return (
    <>
      <Link className={`${styles.navLink} ${styles.login}`} href="/accedi">
        {copy.nav.signIn}
      </Link>
      <Link className={`${styles.btn} ${styles.btnSmall}`} href="/registrati">
        {copy.nav.try}
      </Link>
    </>
  );
}

export type Audience = "clienti" | "saloni";
const SALONI = "/per-i-saloni";

/**
 * La cornice del sito: testata prugna fissa, contenuto, piè di pagina.
 * `clienti`: home con la ricerca, elenco dei saloni, pagine per città. `saloni`: la pagina per i barbieri.
 * `solid`: pagine senza apertura scura, la testata è subito piena.
 */
export function LandShell({ audience, solid = false, children }: { audience: Audience; solid?: boolean; children: React.ReactNode }) {
  const f = copy.footer;
  return (
    <div className={styles.page} data-land="">
      <LandEffects />
      <header className={styles.header} data-land-header="" data-solid={solid ? "true" : undefined} data-scrolled={solid ? "true" : undefined}>
        <div className={styles.headerRow}>
          <Link href="/" aria-label="Taglendo, inizio pagina" className={styles.logo}>
            <Image src="/brand/taglendo-icon.svg" alt="" width={34} height={34} className={styles.logoIcon} priority />
            <Image src="/brand/taglendo-logo-light.svg" alt="Taglendo" width={109} height={26} className={`${styles.logoWord} ${styles.logoLight}`} priority style={{ height: 26, width: "auto" }} />
          </Link>
          <nav className={styles.nav} aria-label="Sezioni">
            <Link href="/cerca" className={styles.navLink}>
              {site.search}
            </Link>
            {audience === "saloni" ? (
              <>
                <Link href={`${SALONI}#come`} className={styles.navLink}>
                  {copy.nav.how}
                </Link>
                <Link href={`${SALONI}#prezzi`} className={styles.navLink}>
                  {copy.nav.prices}
                </Link>
                <Link href={`${SALONI}#domande`} className={styles.navLink}>
                  {copy.nav.faq}
                </Link>
              </>
            ) : null}
          </nav>
          <div className={styles.headerActions}>
            <Suspense fallback={<GuestActions audience={audience} />}>
              <AuthActions audience={audience} />
            </Suspense>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.fTop}>
            <div className={styles.fBrand}>
              <Link className={styles.fLogo} href="/" aria-label="Taglendo, inizio pagina">
                <Image src="/brand/taglendo-icon.svg" alt="" width={44} height={44} />
                <Image src="/brand/taglendo-logo-light.svg" alt="Taglendo" width={140} height={33} style={{ width: 140, height: "auto" }} />
              </Link>
              <p className={styles.fTag}>{f.tagline}</p>
              <Link className={`${styles.btn} ${styles.btnLight} ${styles.btnSmall}`} href={audience === "clienti" ? "/cerca" : "/registrati"}>
                {audience === "clienti" ? site.search : f.cta} <Arrow size={16} />
              </Link>
            </div>
            <div className={styles.fCols}>
              <div className={styles.fCol}>
                <p className={styles.fTitle}>{f.product}</p>
                <ul className={styles.fList}>
                  <li>
                    <Link className={styles.fLink} href="/cerca">
                      {site.search}
                    </Link>
                  </li>
                  <li>
                    <Link className={styles.fLink} href={SALONI}>
                      {site.forSalonsLong}
                    </Link>
                  </li>
                  <li>
                    <Link className={styles.fLink} href={`${SALONI}#prezzi`}>
                      {copy.nav.prices}
                    </Link>
                  </li>
                  <li>
                    <Link className={styles.fLink} href={`${SALONI}#domande`}>
                      {f.faq}
                    </Link>
                  </li>
                  <li>
                    <Link className={styles.fLink} href="/accedi">
                      {copy.nav.signIn}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className={styles.fCol}>
                <p className={styles.fTitle}>{f.legal}</p>
                <ul className={styles.fList}>
                  <li>
                    <Link className={styles.fLink} href="/privacy">
                      {f.privacy}
                    </Link>
                  </li>
                  <li>
                    <Link className={styles.fLink} href="/termini">
                      {f.terms}
                    </Link>
                  </li>
                  <li>
                    <Link className={styles.fLink} href="/cookie">
                      {f.cookies}
                    </Link>
                  </li>
                  <li>
                    <CookieConsent text={marketingCopy.cookie} buttonClassName={`${styles.fLink} ${styles.fButton}`} />
                  </li>
                </ul>
              </div>
              <div className={styles.fCol}>
                <p className={styles.fTitle}>{f.contacts}</p>
                <ul className={styles.fList}>
                  <li>
                    <a className={styles.fLink} href={`mailto:${company.email}`}>
                      {company.email}
                    </a>
                  </li>
                  <li>
                    <span className={styles.fText}>{company.hours}</span>
                  </li>
                  <li>
                    <span className={styles.fText}>{f.reply}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <p className={styles.fWord} aria-hidden="true" />
          <div className={styles.fBottom}>
            <span>
              © 2026 Taglendo <Field value={company.legalName} /> · P.IVA <Field value={company.vat} /> · Sede legale <Field value={company.address} />
            </span>
            <span>{f.photos}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
