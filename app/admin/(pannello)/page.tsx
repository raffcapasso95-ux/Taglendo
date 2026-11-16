import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BarChart } from "@/components/admin/BarChart";
import styles from "@/components/admin/Admin.module.css";
import { loadOverview } from "@/lib/admin/load";
import { adminCopy } from "@/lib/copy/admin";

const copy = adminCopy.overview;

const nf = new Intl.NumberFormat("it-IT");

function Card({ label, value, hint, href, warn }: { label: string; value: number; hint?: string; href?: string; warn?: boolean }) {
  const body = (
    <>
      <span className={`${styles.big} ${styles.num}`}>{nf.format(value)}</span>
      <span className={styles.label}>{label}</span>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </>
  );
  const cls = `${styles.card} ${warn && value > 0 ? styles.warn : ""}`;
  return <li>{href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
}

async function Content() {
  await connection(); // le date relative («ieri», «scade domani») dipendono dal momento
  const o = await loadOverview();
  if (!o) return <p className={styles.notice}>{adminCopy.errors.load}</p>;
  const c = copy.cards;
  return (
    <>
      <section className={styles.section} aria-labelledby="saloni-t">
        <h2 id="saloni-t">{copy.salons}</h2>
        <ul className={styles.cards}>
          <Card label={c.salons} value={o.salons} href="/admin/saloni" />
          <Card label={c.new7} value={o.new7} />
          <Card label={c.new30} value={o.new30} />
          <Card label={c.trialing} value={o.trialing} href="/admin/saloni?stato=trialing" />
          <Card label={c.active} value={o.active} href="/admin/saloni?stato=active" />
          <Card label={c.expired} value={o.expired} href="/admin/saloni?stato=expired" warn />
          <Card label={c.suspended} value={o.suspended} href="/admin/saloni?stato=suspended" />
          <Card label={c.listed} value={o.listed} />
          <Card label={c.hidden} value={o.hidden} href="/admin/saloni?stato=hidden" />
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="guardare-t">
        <h2 id="guardare-t">{copy.watch}</h2>
        <ul className={styles.cards}>
          <Card label={c.blocked} value={o.blocked} hint={copy.hints.blocked} href="/admin/saloni?stato=blocked" warn />
          <Card label={c.incomplete} value={o.incomplete} hint={copy.hints.incomplete} href="/admin/saloni?stato=incomplete" warn />
          <Card label={c.expired} value={o.expired} href="/admin/saloni?stato=expired" warn />
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="attivita-t">
        <h2 id="attivita-t">{copy.activity}</h2>
        <ul className={styles.cards}>
          <Card label={c.today} value={o.appointments.today} />
          <Card label={c.d7} value={o.appointments.d7} />
          <Card label={c.d30} value={o.appointments.d30} />
          <Card label={c.online7} value={o.appointments.online7} />
          <Card label={c.online30} value={o.appointments.online30} />
          <Card label={c.total} value={o.appointments.total} />
          <Card label={c.members} value={o.members} />
          <Card label={c.clients} value={o.clients} />
        </ul>
        <div className={styles.charts}>
          <BarChart title={copy.signups} data={o.signups} />
          <BarChart title={copy.bookings} data={o.bookings} altLabel={copy.online} />
        </div>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <>
      <div className={styles.head}>
        <h1>{copy.title}</h1>
        <p className={styles.lead}>{copy.lead}</p>
      </div>
      <Suspense fallback={<p className={styles.lead}>…</p>}>
        <Content />
      </Suspense>
    </>
  );
}
