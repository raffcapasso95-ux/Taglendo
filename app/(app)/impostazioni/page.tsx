import type { Metadata } from "next";
import { CardsSkeleton } from "@/components/states/Skeletons";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { StoreIcon } from "@/components/app/Icons";
import { SettingsGroup, type SettingsRow } from "@/components/settings/SettingsGroup";
import { BellIcon, CardIcon, HelpIcon } from "@/components/settings/SettingsIcons";
import styles from "@/components/listino/Listino.module.css";
import settings from "@/components/settings/Settings.module.css";
import { signOut } from "@/lib/auth/actions";
import { requireSalon } from "@/lib/auth/session";
import { company } from "@/lib/site";
import { billingEnabled } from "@/lib/billing";
import { listinoCopy } from "@/lib/copy/listino";
import { initials } from "@/lib/rules/agenda";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Impostazioni · Taglendo" };

const copy = listinoCopy.settings;

async function Content() {
  const { name, role, chair_no: chair, salon } = await requireSalon();
  const owner = role === "owner";
  let ownerName = "";
  if (!owner) {
    const supabase = await createClient();
    const { data } = await supabase.from("members").select("name").eq("salon_id", salon.id).eq("role", "owner").limit(1).maybeSingle();
    ownerName = data?.name ?? "";
  }

  if (owner) {
    // Con i pagamenti spenti (beta gratuita) non c'è nessun abbonamento da gestire.
    const salonRows: SettingsRow[] = [{ href: "/salone", label: copy.salonRow, sub: copy.salonRowSub, tone: 3, icon: <StoreIcon size={20} /> }];
    const accountRows: SettingsRow[] = [
      { href: "/impostazioni/avvisi", label: copy.rows.alerts, sub: copy.rowSub.alerts, tone: 0, icon: <BellIcon /> },
      ...(billingEnabled() ? [{ href: "/impostazioni/abbonamento", label: copy.rows.subscription, sub: "", tone: 1 as const, icon: <CardIcon /> }] : []),
    ];
    return (
      <main className={cx(styles.page, settings.page)}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>{name.split(/\s+/)[0]} · Titolare</p>
          <h1 className={styles.title}>{copy.title}</h1>
        </header>

        <Link href="/profilo" className={settings.profile}>
          <span className={settings.avatar}>{initials(name)}</span>
          <span className={settings.text}>
            <span className={settings.profileName}>{name}</span>
            <span className={settings.sub}>Titolare · Poltrona {chair}</span>
          </span>
          <span className={settings.chev} aria-hidden="true">
            ›
          </span>
        </Link>

        <SettingsGroup id="set-salone" title={copy.salon} rows={salonRows} />
        <SettingsGroup id="set-account" title={copy.account} rows={accountRows} />
        <SettingsGroup
          id="set-aiuto"
          title={copy.help.title}
          rows={[{ href: `mailto:${company.email}?subject=Taglendo%3A%20segnalazione`, label: copy.help.row, sub: copy.help.sub, tone: 2, icon: <HelpIcon /> }]}
        />

        <section className={settings.section}>
          <form action={signOut}>
            <button className={cx(styles.logout, settings.logout)} type="submit">
              {copy.logout}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>
          {name.split(/\s+/)[0]} · Barbiere
        </p>
        <h1 className={styles.title}>{copy.title}</h1>
      </header>

      <section className={styles.section} aria-labelledby="salon-title">
        <h2 id="salon-title" className={styles.sectionTitle}>
          {copy.salon}
        </h2>
        <Card flush>
          {[copy.rows.listino, copy.rows.rules].map((label) => (
            <div key={label} className={styles.navRow}>
              <span>{label}</span>
              <span className={styles.navSub}>{copy.ownerOnly}</span>
            </div>
          ))}
        </Card>
        <p className={styles.note}>{copy.askOwner(ownerName)}</p>
      </section>

      <section className={styles.section} aria-labelledby="profile-title">
        <h2 id="profile-title" className={styles.sectionTitle}>
          {copy.profile}
        </h2>
        <Card flush>
          <Link href="/profilo" className={styles.navRow}>
            <span className={styles.profile}>
              <span className={styles.avatar} aria-hidden="true">
                {initials(name)}
              </span>
              <span>
                {name}
                <span className={styles.navSub}>
                  Barbiere · Poltrona {chair}
                </span>
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        </Card>
      </section>

      <section className={styles.section} aria-labelledby="help-title">
        <h2 id="help-title" className={styles.sectionTitle}>
          {copy.help.title}
        </h2>
        <Card flush>
          <a href={`mailto:${company.email}?subject=Taglendo%3A%20segnalazione`} className={styles.navRow}>
            <span>
              {copy.help.row}
              <span className={styles.navSub}>{copy.help.sub}</span>
            </span>
            <span aria-hidden="true">›</span>
          </a>
        </Card>
      </section>

      <section className={styles.section}>
        <form action={signOut}>
          <button type="submit" className={styles.logout}>
            {copy.logout}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Content />
    </Suspense>
  );
}
