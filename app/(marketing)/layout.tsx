import { Suspense } from "react";
import { AuthLinks, GuestLinks } from "@/components/marketing/AuthLinks";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import styles from "@/components/marketing/Marketing.module.css";

/** Cornice delle pagine del sito: barra in alto, contenuto, piè di pagina con i link legali e le preferenze cookie. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <SiteHeader>
        <Suspense fallback={<GuestLinks />}>
          <AuthLinks />
        </Suspense>
      </SiteHeader>
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
