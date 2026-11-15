import Image from "next/image";
import Link from "next/link";
import { CookieConsent } from "@/components/salon/CookieConsent";
import { marketingCopy as copy } from "@/lib/copy/marketing";
import { company, isPlaceholder } from "@/lib/site";
import styles from "./Marketing.module.css";

/** Un dato dell'azienda: se è ancora un segnaposto si vede evidenziato. */
export function Field({ value }: { value: string }) {
  return isPlaceholder(value) ? <mark className={styles.placeholder}>{value}</mark> : <>{value}</>;
}

export function SiteFooter() {
  const f = copy.footer;
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <Image src="/brand/taglendo-logo-light.svg" alt="Taglendo" width={160} height={38} style={{ width: 160, height: "auto" }} />
            <span className={styles.footerText}>{f.tagline}</span>
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>{f.product}</span>
            <Link href="/per-i-saloni#come" className={styles.footerLink}>{copy.nav.how}</Link>
            <Link href="/per-i-saloni#prezzi" className={styles.footerLink}>{copy.nav.prices}</Link>
            <Link href="/per-i-saloni#domande" className={styles.footerLink}>{f.faq}</Link>
            <Link href="/accedi" className={styles.footerLink}>{copy.nav.signIn}</Link>
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>{f.legal}</span>
            <Link href="/privacy" className={styles.footerLink}>{f.privacy}</Link>
            <Link href="/termini" className={styles.footerLink}>{f.terms}</Link>
            <Link href="/cookie" className={styles.footerLink}>{f.cookies}</Link>
            <CookieConsent text={copy.cookie} buttonClassName={styles.footerButton} />
          </div>
          <div className={styles.footerCol}>
            <span className={styles.footerTitle}>{f.contacts}</span>
            <a href={`mailto:${company.email}`} className={styles.footerLink}>{company.email}</a>
            <span className={styles.footerText}>{company.hours}</span>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>
            © 2026 Taglendo
          </span>
        </div>
      </div>
    </footer>
  );
}
