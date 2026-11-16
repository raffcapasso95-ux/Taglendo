import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { agoLabel, dateLabel, stateBadge } from "@/components/admin/format";
import styles from "@/components/admin/Admin.module.css";
import { PAGE_SIZE, STATES, listHref, loadSalons, parseFilters, type Filters, type SalonRow } from "@/lib/admin/load";
import { adminCopy } from "@/lib/copy/admin";

const copy = adminCopy.list;

type Params = { q?: string | string[]; stato?: string | string[]; ordina?: string | string[]; dir?: string | string[]; pagina?: string | string[] };

const TONE = { ok: styles.bOk, warn: styles.bWarn, bad: styles.bBad, plain: "" } as const;

/** L'intestazione di una colonna ordinabile: il clic ordina, un secondo clic inverte. */
function Sortable({ f, col, children }: { f: Filters; col: Filters["sort"]; children: string }) {
  const on = f.sort === col;
  return (
    <th scope="col" aria-sort={on ? (f.dir === "asc" ? "ascending" : "descending") : undefined}>
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
      <td data-label={copy.cols.since}>{dateLabel(r.created_at)}</td>
      <td data-label={copy.cols.last}>{agoLabel(r.last_activity)}</td>
      <td data-label={copy.cols.appts}>
        <span className={styles.num}>
          {r.appts}
          <span className={styles.sub}>
            {copy.last30(r.appts30)} · {copy.barbers(r.members)}
          </span>
        </span>
      </td>
    </tr>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection(); // le date relative («ieri», «scade domani») dipendono dal momento
  const f = parseFilters(await searchParams);
  const data = await loadSalons(f);
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
        <div className={styles.field} style={{ flex: "0 1 220px" }}>
          <label htmlFor="stato">{copy.state}</label>
          <select id="stato" name="stato" defaultValue={f.stato} className={styles.select}>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {adminCopy.states[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={styles.btn}>
          {copy.submit}
        </button>
        {filtered ? (
          <Link href="/admin/saloni" className={`${styles.btn} ${styles.btnLine}`}>
            {copy.reset}
          </Link>
        ) : null}
      </form>

      <p className={styles.label} role="status">
        {copy.found(data.total)}
      </p>

      {data.rows.length === 0 ? (
        <p className={`${styles.tableWrap} ${styles.empty}`}>{copy.none}</p>
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
                <Sortable f={f} col="created">
                  {copy.cols.since}
                </Sortable>
                <Sortable f={f} col="activity">
                  {copy.cols.last}
                </Sortable>
                <Sortable f={f} col="appointments">
                  {copy.cols.appts}
                </Sortable>
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
