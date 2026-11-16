import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LandEffects } from "@/components/marketing/LandEffects";
import { CookieConsent } from "@/components/salon/CookieConsent";
import { AccountMenu } from "@/components/marketing/AccountMenu";
import { getAccount } from "@/components/marketing/AuthLinks";
import { saloniCopy } from "@/lib/copy/saloni";
import { searchCopy } from "@/lib/copy/search";
import { marketingCopy } from "@/lib/copy/marketing";
import { company } from "@/lib/site";
import styles from "@/components/marketing/Land.module.css";

const site = searchCopy.site;
const nav = saloniCopy.nav;


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
        {nav.signIn}
      </Link>
      <Link className={`${styles.btn} ${styles.btnSmall}`} href="/registrati">
        {nav.try}
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
 * `light` (saloni): testata chiara e piena, per le pagine senza apertura su foto (Funzioni). `current`: la voce della pagina in cui si è.
 * `overlay` (clienti): la testata è trasparente sulla foto dell'apertura e diventa chiara appena si scorre.
 */
export function LandShell({ audience, solid = false, overlay = false, light = false, current, children }: { audience: Audience; solid?: boolean; overlay?: boolean; light?: boolean; current?: "funzioni"; children: React.ReactNode }) {
  const f = searchCopy.footer;
  return (
    <div className={styles.page} data-land="">
      <LandEffects />
      {/* clienti: testata chiara, sempre piena; saloni: prugna, trasparente sulla foto dell'apertura */}
      <header
        className={styles.header}
        data-land-header=""
        data-audience={audience}
        data-tone={audience === "clienti" ? (overlay ? "auto" : "light") : light ? "light" : undefined}
        data-solid={solid || light || (audience === "clienti" && !overlay) ? "true" : undefined}
        data-scrolled={solid || light || (audience === "clienti" && !overlay) ? "true" : undefined}
      >
        <div className={styles.headerRow}>
          <Link href={audience === "clienti" ? "/" : SALONI} aria-label={audience === "clienti" ? "Taglendo, inizio pagina" : site.businessHome} className={styles.logo}>
            <Image src="/brand/taglendo-icon.svg" alt="" width={34} height={34} className={styles.logoIcon} priority />
            {audience === "clienti" || light ? (
              <>
                <Image src="/brand/taglendo-logo.svg" alt="Taglendo" width={109} height={26} className={`${styles.logoWord} ${styles.logoDark}`} priority style={{ height: 26, width: "auto" }} />
                {overlay ? <Image src="/brand/taglendo-logo-light.svg" alt="" aria-hidden="true" width={109} height={26} className={`${styles.logoWord} ${styles.logoLight}`} priority style={{ height: 26, width: "auto" }} /> : null}
              </>
            ) : (
              <Image src="/brand/taglendo-logo-light.svg" alt="Taglendo" width={109} height={26} className={`${styles.logoWord} ${styles.logoLight}`} priority style={{ height: 26, width: "auto" }} />
            )}
          </Link>

          <nav className={styles.nav} aria-label={audience === "clienti" ? site.servicesLabel : "Sezioni"}>
            {audience === "clienti" ? (
              <>
                {site.services.map((v) => (
                  <Link key={v.name} href={`/cerca?servizio=${encodeURIComponent(v.query)}`} className={styles.navLink}>
                    {v.name}
                  </Link>
                ))}
              </>
            ) : (
              <>
                <Link href={`${SALONI}#come`} className={styles.navLink}>
                  {nav.how}
                </Link>
                <Link href={`${SALONI}/funzioni`} className={styles.navLink} aria-current={current === "funzioni" ? "page" : undefined}>
                  {nav.features}
                </Link>
                <Link href={`${SALONI}#costo`} className={styles.navLink}>
                  {nav.cost}
                </Link>
              </>
            )}
          </nav>
          <div className={styles.headerActions}>
            {audience === "saloni" ? (
              <Link href="/" className={`${styles.navLink} ${styles.clientLink}`} aria-label={nav.clientAria}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
                <span className={styles.clientText}>{nav.client}</span>
              </Link>
            ) : null}
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
                <Image src="/brand/taglendo-logo-light.svg" alt="Taglendo" width={140} height={33} style={{ width: 140, height: "auto" }} />
              </Link>
              <p className={styles.fTag}>{f.tagline}</p>
            </div>
            <div className={styles.fCols}>
              <div className={styles.fCol}>
                <p className={styles.fTitle}>{f.clients}</p>
                <ul className={styles.fList}>
                  <li>
                    <Link className={styles.fLink} href="/">
                      {f.search}
                    </Link>
                  </li>
                  <li>
                    <Link className={styles.fLink} href="/cerca">
                      {f.near}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className={styles.fCol}>
                <p className={styles.fTitle}>{f.salons}</p>
                <ul className={styles.fList}>
                  <li>
                    <Link className={styles.fLink} href={SALONI}>
                      {f.forSalons}
                    </Link>
                  </li>
                  <li>
                    <Link className={styles.fLink} href={`${SALONI}/funzioni`}>
                      {f.features}
                    </Link>
                  </li>
                  <li>
                    <Link className={styles.fLink} href="/registrati">
                      {f.register}
                    </Link>
                  </li>
                  <li>
                    <Link className={styles.fLink} href="/accedi">
                      {f.signIn}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className={styles.fCol}>
                <p className={styles.fTitle}>{f.company}</p>
                <ul className={styles.fList}>
                  <li>
                    <a className={styles.fLink} href={`mailto:${company.email}`}>
                      {company.email}
                    </a>
                  </li>
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
            </div>
          </div>
          <div className={styles.fBottom}>
            <span>© 2026 Taglendo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
