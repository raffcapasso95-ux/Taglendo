import type { Metadata } from "next";
import { CardsSkeleton } from "@/components/states/Skeletons";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import styles from "@/components/listino/Listino.module.css";
import { signOut } from "@/lib/auth/actions";
import { requireSalon } from "@/lib/auth/session";
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

  const rows = [
    { href: "/listino", label: copy.rows.listino },
    { href: "/impostazioni/operatori", label: copy.rows.operators, sub: copy.operatorsSub },
    { href: "/impostazioni/regole", label: copy.rows.rules },
    { href: "/impostazioni/email", label: copy.rows.emails },
    { href: "/impostazioni/pagina", label: copy.rows.page },
    { href: "/impostazioni/avvisi", label: copy.rows.alerts },
    // Con i pagamenti spenti (beta gratuita) non c'è nessun abbonamento da gestire.
    ...(billingEnabled() ? [{ href: "/impostazioni/abbonamento", label: copy.rows.subscription }] : []),
  ];

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>
          {name.split(/\s+/)[0]} · {owner ? "Titolare" : "Barbiere"}
        </p>
        <h1 className={styles.title}>{copy.title}</h1>
      </header>

      <section className={styles.section} aria-labelledby="salon-title">
        <h2 id="salon-title" className={styles.sectionTitle}>
          {copy.salon}
        </h2>
        <Card flush>
          {owner
            ? rows.map((r) => (
                <Link key={r.href} href={r.href} className={styles.navRow}>
                  <span>
                    {r.label}
                    {"sub" in r && r.sub ? <span className={styles.navSub}>{r.sub}</span> : null}
                  </span>
                  <span aria-hidden="true">›</span>
                </Link>
              ))
            : [copy.rows.listino, copy.rows.rules].map((label) => (
                <div key={label} className={styles.navRow}>
                  <span>{label}</span>
                  <span className={styles.navSub}>{copy.ownerOnly}</span>
                </div>
              ))}
        </Card>
        {!owner ? <p className={styles.note}>{copy.askOwner(ownerName)}</p> : null}
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
                  {owner ? "Titolare" : "Barbiere"} · Poltrona {chair}
                </span>
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        </Card>
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
