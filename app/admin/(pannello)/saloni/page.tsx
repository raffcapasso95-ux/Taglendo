import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { agoLabel, dateLabel, stateBadge } from "@/components/admin/format";
import styles from "@/components/admin/Admin.module.css";
import { RowMenu } from "@/components/admin/RowMenu";
import { ViewToggle } from "@/components/admin/ViewToggle";
import { PAGE_SIZE, STATES, listHref, loadOverview, loadSalons, parseFilters, type Filters, type Overview, type SalonRow } from "@/lib/admin/load";
import { adminCopy } from "@/lib/copy/admin";

const copy = adminCopy.list;

type Params = { vista?: string | string[]; q?: string | string[]; stato?: string | string[]; ordina?: string | string[]; dir?: string | string[]; pagina?: string | string[] };

const TONE = { ok: styles.bOk, warn: styles.bWarn, bad: styles.bBad, plain: "" } as const;

/** L'intestazione di una colonna ordinabile: il clic ordina, un secondo clic inverte. */
function Sortable({ f, col, children, className }: { f: Filters; col: Filters["sort"]; children: string; className?: string }) {
  const on = f.sort === col;
  return (
    <th scope="col" className={className} aria-sort={on ? (f.dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link className={styles.sortLink} aria-current={on ? "true" : undefined} href={listHref(f, { sort: col, dir: on && f.dir === "desc" ? "asc" : "desc", page: 1 })}>
        {children}
        {on ? (f.dir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    </th>
  );
}

function Row({ r }: { r: SalonRow }) {
  const badge = stateBadge(r);
  return (
    <tr>
      <td data-label={copy.cols.salon}>
        <span>
          <Link href={`/admin/saloni/${r.id}`} className={styles.rowLink}>
            {r.name}
          </Link>
          <span className={styles.sub}>{[r.city, r.slug].filter(Boolean).join(" · ")}</span>
        </span>
      </td>
      <td data-label={copy.cols.owner}>
        <span>
          {r.owner_name ?? "—"}
          <span className={styles.sub}>{r.owner_email ?? ""}</span>
        </span>
      </td>
      <td data-label={copy.cols.state}>
        <span className={styles.badges}>
          <span className={`${styles.badge} ${TONE[badge.tone]}`}>{badge.text}</span>
          {r.admin_hidden ? <span className={styles.badge}>{adminCopy.badges.hidden}</span> : null}
        </span>
      </td>
      <td data-label={copy.cols.since} className={styles.hideMid}>{dateLabel(r.created_at)}</td>
      <td data-label={copy.cols.last} className={styles.hideMid}>{agoLabel(r.last_activity)}</td>
      <td data-label={copy.cols.appts}>
        <span className={styles.num}>
          {r.appts}
          <span className={`${styles.sub} ${styles.subWrap}`}>
            {copy.last30(r.appts30)} · {copy.barbers(r.members)}
          </span>
          <span className={`${styles.sub} ${styles.subWrap} ${styles.showMid}`}>
            {copy.cols.last}: {agoLabel(r.last_activity)}
          </span>
        </span>
      </td>
      <td data-label="" className={styles.actionsCell}>
        <RowMenu salon={{ id: r.id, name: r.name, slug: r.slug, hidden: r.admin_hidden, suspended: Boolean(r.suspended_at) }} />
      </td>
    </tr>
  );
}

function SalonCard({ r }: { r: SalonRow }) {
  const badge = stateBadge(r);
  return (
    <li>
      <article className={styles.sCard}>
        <div className={styles.sCardHead}>
          <span>
            <Link href={`/admin/saloni/${r.id}`} className={styles.rowLink}>
              <strong>{r.name}</strong>
            </Link>
            <span className={styles.sub}>{[r.city, r.slug].filter(Boolean).join(" · ")}</span>
          </span>
          <RowMenu salon={{ id: r.id, name: r.name, slug: r.slug, hidden: r.admin_hidden, suspended: Boolean(r.suspended_at) }} />
        </div>
        <span className={styles.badges}>
          <span className={`${styles.badge} ${TONE[badge.tone]}`}>{badge.text}</span>
          {r.admin_hidden ? <span className={styles.badge}>{adminCopy.badges.hidden}</span> : null}
        </span>
        <div>
          {r.owner_name ?? "—"}
          <span className={styles.sub}>{r.owner_email ?? ""}</span>
        </div>
        <dl className={styles.sCardFacts}>
          <div>
            <dt>{copy.cols.appts}</dt>
            <dd>{r.appts}</dd>
          </div>
          <div>
            <dt>{copy.cols.last}</dt>
            <dd>{agoLabel(r.last_activity)}</dd>
          </div>
          <div>
            <dt>{copy.cols.since}</dt>
            <dd>{dateLabel(r.created_at)}</dd>
          </div>
          <div>
            <dt>{copy.barbers(r.members)}</dt>
            <dd>{copy.last30(r.appts30)}</dd>
          </div>
        </dl>
      </article>
    </li>
  );
}

/** Quanti saloni per stato, dalla panoramica (le pastiglie mostrano il numero). */
function countOf(o: Overview | null, s: (typeof STATES)[number]): number | null {
  if (!o) return null;
  const map = { all: o.salons, trialing: o.trialing, active: o.active, expired: o.expired, suspended: o.suspended, incomplete: o.incomplete, hidden: o.hidden, blocked: o.blocked } as const;
  return map[s];
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection(); // le date relative («ieri», «scade domani») dipendono dal momento
  const f = parseFilters(await searchParams);
  const [data, overview] = await Promise.all([loadSalons(f), loadOverview()]);
  if (!data) return <p className={styles.notice}>{adminCopy.errors.load}</p>;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const filtered = Boolean(f.q) || f.stato !== "all";
  return (
    <>
      <form method="get" action="/admin/saloni" className={styles.filters} role="search" aria-label={copy.searchLabel}>
        <div className={styles.field}>
          <label htmlFor="q">{copy.searchLabel}</label>
          <input id="q" name="q" type="search" defaultValue={f.q} placeholder={copy.search} className={styles.input} autoComplete="off" />
        </div>
        {f.stato !== "all" ? <input type="hidden" name="stato" value={f.stato} /> : null}
        {f.view === "schede" ? <input type="hidden" name="vista" value="schede" /> : null}
        <button type="submit" className={styles.btn}>
          {copy.submit}
        </button>
        {filtered ? (
          <Link href="/admin/saloni" className={`${styles.btn} ${styles.btnLine}`}>
            {copy.reset}
          </Link>
        ) : null}
      </form>

      <nav aria-label={adminCopy.filters.label}>
        <ul className={styles.chips}>
          {STATES.map((st) => {
            const n = countOf(overview, st);
            return (
              <li key={st}>
                <Link href={listHref(f, { stato: st, page: 1 })} className={styles.chip} aria-current={f.stato === st ? "true" : undefined}>
                  {adminCopy.states[st]}
                  {n !== null ? <span className={styles.chipN}>{n}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.toolbar}>
        <p className={styles.label} role="status">
          {copy.found(data.total)}
        </p>
        <ViewToggle view={f.view} href={(v) => listHref(f, { view: v })} />
      </div>

      {data.rows.length === 0 ? (
        <p className={`${styles.tableWrap} ${styles.empty}`}>{copy.none}</p>
      ) : f.view === "schede" ? (
        <ul className={styles.gridCards}>
          {data.rows.map((r) => (
            <SalonCard key={r.id} r={r} />
          ))}
        </ul>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <Sortable f={f} col="name">
                  {copy.cols.salon}
                </Sortable>
                <th scope="col">{copy.cols.owner}</th>
                <th scope="col">{copy.cols.state}</th>
                <Sortable f={f} col="created" className={styles.hideMid}>
                  {copy.cols.since}
                </Sortable>
                <Sortable f={f} col="activity" className={styles.hideMid}>
                  {copy.cols.last}
                </Sortable>
                <Sortable f={f} col="appointments">
                  {copy.cols.appts}
                </Sortable>
                <th scope="col" className={styles.actionsCell}>
                  <span className={styles.srOnly}>{copy.cols.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <Row key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <nav className={styles.pager} aria-label="Pagine">
          {f.page > 1 ? (
            <Link href={listHref(f, { page: f.page - 1 })} className={`${styles.btn} ${styles.btnLine}`}>
              {copy.prev}
            </Link>
          ) : (
            <span />
          )}
          <span className={styles.label}>{copy.page(f.page, pages)}</span>
          {f.page < pages ? (
            <Link href={listHref(f, { page: f.page + 1 })} className={`${styles.btn} ${styles.btnLine}`}>
              {copy.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <div className={styles.head}>
        <h1>{copy.title}</h1>
      </div>
      <Suspense fallback={<p className={styles.lead}>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
