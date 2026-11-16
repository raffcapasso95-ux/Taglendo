import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BarChart } from "@/components/admin/BarChart";
import { agoLabel, stateBadge } from "@/components/admin/format";
import styles from "@/components/admin/Admin.module.css";
import { loadOverview, loadSalons, type Filters, type Overview, type SalonRow } from "@/lib/admin/load";
import { adminCopy } from "@/lib/copy/admin";

const copy = adminCopy.overview;
const nf = new Intl.NumberFormat("it-IT");
const TONE = { ok: styles.bOk, warn: styles.bWarn, bad: styles.bBad, plain: "" } as const;
const base: Filters = { view: "tabella", q: "", stato: "all", sort: "created", dir: "desc", page: 1 };

/** L'andamento in una riga: una linea sottile con i valori del periodo. */
function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 96},${34 - (v / max) * 32}`).join(" ");
  return (
    <svg className={styles.spark} viewBox="0 0 96 36" aria-hidden="true">
      <polyline points={pts} />
    </svg>
  );
}

function Kpi({ label, value, hint, href, spark }: { label: string; value: string; hint: string; href?: string; spark?: number[] }) {
  const body = (
    <>
      <span className={styles.label}>{label}</span>
      <span className={styles.kpiTop}>
        <span className={`${styles.kpiBig} ${styles.num}`}>{value}</span>
        {spark ? <Spark values={spark} /> : null}
      </span>
      <span className={styles.hint}>{hint}</span>
    </>
  );
  return <li>{href ? <Link href={href} className={styles.kpi}>{body}</Link> : <div className={styles.kpi}>{body}</div>}</li>;
}

function Mix({ o }: { o: Overview }) {
  const c = copy.cards;
  const rows = [
    { key: "trialing", label: c.trialing, n: o.trialing, color: "var(--brand-apricot)" },
    { key: "active", label: c.active, n: o.active, color: "var(--status-success)" },
    { key: "expired", label: c.expired, n: o.expired, color: "var(--status-warning)" },
    { key: "suspended", label: c.suspended, n: o.suspended, color: "var(--status-error)" },
    { key: "incomplete", label: c.incomplete, n: o.incomplete, color: "var(--text-secondary)" },
  ];
  const total = Math.max(1, rows.reduce((a, r) => a + r.n, 0));
  return (
    <section className={styles.tile} aria-labelledby="mix-t">
      <div className={styles.tileHead}>
        <h2 id="mix-t">{copy.mix}</h2>
        <Link href="/admin/saloni">{copy.viewAll}</Link>
      </div>
      <div className={styles.mixBar} aria-hidden="true">
        {rows.filter((r) => r.n > 0).map((r) => (
          <span key={r.key} className={styles.mixSeg} style={{ width: `${(r.n / total) * 100}%`, background: r.color }} />
        ))}
      </div>
      <ul className={styles.mixList}>
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={`/admin/saloni?stato=${r.key}`}>
              <i className={styles.swatch} style={{ background: r.color }} />
              <span className={styles.mixName}>{r.label}</span>
              <span className={styles.num}>{nf.format(r.n)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Feed({ rows, why }: { rows: SalonRow[]; why?: boolean }) {
  return (
    <ul className={styles.feed}>
      {rows.map((r) => {
        const b = stateBadge(r);
        const reason = why ? (r.state === "expired" ? copy.why.expired : r.state === "incomplete" ? copy.why.incomplete : copy.why.blocked) : [r.city, agoLabel(r.created_at)].filter(Boolean).join(" · ");
        return (
          <li key={r.id}>
            <Link href={`/admin/saloni/${r.id}`}>
              <span className={styles.feedText}>
                <strong>{r.name}</strong>
                <span>{reason}</span>
              </span>
              <span className={`${styles.badge} ${TONE[b.tone]}`}>{b.text}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

async function Content() {
  await connection(); // le date relative («ieri», «scade domani») dipendono dal momento
  const [o, recent, blocked, incomplete, expired] = await Promise.all([
    loadOverview(),
    loadSalons(base, 6),
    loadSalons({ ...base, stato: "blocked" }, 4),
    loadSalons({ ...base, stato: "incomplete" }, 4),
    loadSalons({ ...base, stato: "expired" }, 4),
  ]);
  if (!o) return <p className={styles.notice}>{adminCopy.errors.load}</p>;
  const k = copy.kpi;
  const c = copy.cards;
  const watch = [...(expired?.rows ?? []), ...(blocked?.rows ?? []), ...(incomplete?.rows ?? [])].filter((r, i, a) => a.findIndex((x) => x.id === r.id) === i).slice(0, 6);
  const online = o.appointments.d30 ? Math.round((o.appointments.online30 / o.appointments.d30) * 100) : 0;
  return (
    <>
      <ul className={styles.kpis}>
        <Kpi label={k.salons} value={nf.format(o.salons)} hint={`${nf.format(o.new7)} ${k.new7}`} href="/admin/saloni" spark={o.signups.map((p) => p.n)} />
        <Kpi label={k.d30} value={nf.format(o.appointments.d30)} hint={k.d30hint(o.appointments.today)} spark={o.bookings.map((p) => p.n)} />
        <Kpi label={k.online} value={`${online}%`} hint={k.onlineHint} spark={o.bookings.map((p) => p.online ?? 0)} />
        <Kpi label={c.trialing} value={nf.format(o.trialing)} hint={`${nf.format(o.active)} ${c.active.toLowerCase()}`} href="/admin/saloni?stato=trialing" />
      </ul>

      <div className={styles.split}>
        <Mix o={o} />
        <section className={styles.tile} aria-labelledby="watch-t">
          <div className={styles.tileHead}>
            <h2 id="watch-t">{copy.watch}</h2>
          </div>
          {watch.length === 0 ? <p className={styles.muted}>{copy.watchNone}</p> : <Feed rows={watch} why />}
        </section>
      </div>

      <div className={styles.charts}>
        <BarChart title={copy.signups} data={o.signups} />
        <BarChart title={copy.bookings} data={o.bookings} altLabel={copy.online} />
      </div>

      <div className={styles.split}>
        <section className={styles.tile} aria-labelledby="recent-t">
          <div className={styles.tileHead}>
            <h2 id="recent-t">{copy.recent}</h2>
            <Link href="/admin/saloni">{copy.viewAll}</Link>
          </div>
          <Feed rows={recent?.rows ?? []} />
        </section>
        <section className={styles.tile} aria-labelledby="att-t">
          <h2 id="att-t">{copy.activity}</h2>
          <ul className={styles.miniStats}>
            <li><strong className={styles.num}>{nf.format(o.appointments.today)}</strong><span className={styles.label}>{c.today}</span></li>
            <li><strong className={styles.num}>{nf.format(o.appointments.d7)}</strong><span className={styles.label}>{c.d7}</span></li>
            <li><strong className={styles.num}>{nf.format(o.appointments.total)}</strong><span className={styles.label}>{c.total}</span></li>
            <li><strong className={styles.num}>{nf.format(o.members)}</strong><span className={styles.label}>{c.members}</span></li>
            <li><strong className={styles.num}>{nf.format(o.clients)}</strong><span className={styles.label}>{c.clients}</span></li>
            <li><strong className={styles.num}>{nf.format(o.listed)}</strong><span className={styles.label}>{c.listed}</span></li>
          </ul>
        </section>
      </div>
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
