import type { Metadata } from "next";
import { CardsSkeleton } from "@/components/states/Skeletons";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { ScissorsIcon, UsersIcon } from "@/components/app/Icons";
import { BellIcon, CardIcon, HelpIcon, MailIcon, PageIcon, RulesIcon } from "@/components/settings/SettingsIcons";
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

type Row = { href: string; label: string; sub: string; tone: 0 | 1 | 2 | 3; icon: ReactNode };

/** Un gruppo di righe con icona colorata e una riga di spiegazione (Impostazioni del titolare). */
function Group({ id, title, rows }: { id: string; title: string; rows: Row[] }) {
  return (
    <section className={settings.section} aria-labelledby={id}>
      <h2 className={settings.title} id={id}>
        {title}
      </h2>
      <div className={settings.group}>
        {rows.map((r) => {
          const inner = (
            <>
              <span className={cx(settings.icon, settings[`t${r.tone}` as "t0"])}>{r.icon}</span>
              <span className={settings.text}>
                <span className={settings.label}>{r.label}</span>
                {r.sub ? <span className={settings.sub}>{r.sub}</span> : null}
              </span>
              <span className={settings.chev} aria-hidden="true">
                ›
              </span>
            </>
          );
          return r.href.startsWith("mailto:") ? (
            <a key={r.href} className={settings.row} href={r.href}>
              {inner}
            </a>
          ) : (
            <Link key={r.href} className={settings.row} href={r.href}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

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
    const salonRows: Row[] = [
      { href: "/listino", label: copy.rows.listino, sub: copy.rowSub.listino, tone: 0, icon: <ScissorsIcon /> },
      { href: "/impostazioni/operatori", label: copy.rows.operators, sub: copy.operatorsSub, tone: 1, icon: <UsersIcon /> },
      { href: "/impostazioni/regole", label: copy.rows.rules, sub: copy.rowSub.rules, tone: 2, icon: <RulesIcon /> },
      { href: "/impostazioni/pagina", label: copy.rows.page, sub: copy.rowSub.page, tone: 3, icon: <PageIcon /> },
      ...(billingEnabled() ? [{ href: "/impostazioni/abbonamento", label: copy.rows.subscription, sub: "", tone: 1 as const, icon: <CardIcon /> }] : []),
    ];
    const messageRows: Row[] = [
      { href: "/impostazioni/email", label: copy.rows.emails, sub: copy.rowSub.emails, tone: 1, icon: <MailIcon /> },
      { href: "/impostazioni/avvisi", label: copy.rows.alerts, sub: copy.rowSub.alerts, tone: 0, icon: <BellIcon /> },
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

        <Group id="set-salone" title={copy.salon} rows={salonRows} />
        <Group id="set-clienti" title={copy.messages} rows={messageRows} />
        <Group
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
