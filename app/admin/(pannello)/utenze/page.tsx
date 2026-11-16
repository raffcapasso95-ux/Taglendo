import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddAdmin } from "@/components/admin/AddAdmin";
import { agoLabel, dateLabel } from "@/components/admin/format";
import styles from "@/components/admin/Admin.module.css";
import { UserMenu } from "@/components/admin/UserMenu";
import { ViewToggle } from "@/components/admin/ViewToggle";
import { getAdmin } from "@/lib/admin/session";
import { PAGE_SIZE, USER_FILTERS, loadUsers, parseUserFilters, userHref, type UserFilters, type UserRow } from "@/lib/admin/load";
import { adminCopy } from "@/lib/copy/admin";

const copy = adminCopy.users;

type Params = { vista?: string | string[]; q?: string | string[]; stato?: string | string[]; ordina?: string | string[]; dir?: string | string[]; pagina?: string | string[] };

const TONE = { active: styles.bOk, invited: styles.bWarn, unconfirmed: styles.bWarn, inactive: "", blocked: styles.bBad } as const;

function Sortable({ f, col, children }: { f: UserFilters; col: UserFilters["sort"]; children: string }) {
  const on = f.sort === col;
  return (
    <th scope="col" aria-sort={on ? (f.dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link className={styles.sortLink} aria-current={on ? "true" : undefined} href={userHref(f, { sort: col, dir: on && f.dir === "desc" ? "asc" : "desc", page: 1 })}>
        {children}
        {on ? (f.dir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    </th>
  );
}

function Badges({ r }: { r: UserRow }) {
  return (
    <span className={styles.badges}>
      <span className={`${styles.badge} ${TONE[r.state]}`}>{copy.badges[r.state]}</span>
      {r.is_admin ? <span className={styles.badge}>{copy.badges.admin}</span> : null}
      {r.suspended_at ? <span className={`${styles.badge} ${styles.bBad}`}>{adminCopy.badges.suspended}</span> : null}
    </span>
  );
}

function SalonLink({ r }: { r: UserRow }) {
  return r.salon_id ? (
    <Link href={`/admin/saloni/${r.salon_id}`} className={styles.rowLink}>
      {r.salon_name}
    </Link>
  ) : (
    <span className={styles.muted}>{copy.noSalon}</span>
  );
}

function Row({ r, self }: { r: UserRow; self: string | null }) {
  return (
    <tr>
      <td data-label={copy.cols.user}>
        <span>
          {r.name}
          <span className={styles.sub}>{r.email ?? "—"}</span>
        </span>
      </td>
      <td data-label={copy.cols.role}>{copy.roles[r.role]}</td>
      <td data-label={copy.cols.salon}>
        <SalonLink r={r} />
      </td>
      <td data-label={copy.cols.state}>
        <Badges r={r} />
      </td>
      <td data-label={copy.cols.access}>{r.last_sign_in_at ? agoLabel(r.last_sign_in_at) : copy.never}</td>
      <td data-label={copy.cols.since} className={styles.hideMid}>{r.created_at ? dateLabel(r.created_at) : "—"}</td>
      <td data-label="" className={styles.actionsCell}>
        <UserMenu row={r} self={r.user_id === self} />
      </td>
    </tr>
  );
}

function UserCard({ r, self }: { r: UserRow; self: string | null }) {
  return (
    <li>
      <article className={styles.sCard}>
        <div className={styles.sCardHead}>
          <span>
            <strong>{r.name}</strong>
            <span className={styles.sub}>{r.email ?? "—"}</span>
          </span>
          <UserMenu row={r} self={r.user_id === self} />
        </div>
        <Badges r={r} />
        <dl className={styles.sCardFacts}>
          <div>
            <dt>{copy.cols.role}</dt>
            <dd>{copy.roles[r.role]}</dd>
          </div>
          <div>
            <dt>{copy.cols.salon}</dt>
            <dd>
              <SalonLink r={r} />
            </dd>
          </div>
          <div>
            <dt>{copy.cols.access}</dt>
            <dd>{r.last_sign_in_at ? agoLabel(r.last_sign_in_at) : copy.never}</dd>
          </div>
          <div>
            <dt>{copy.cols.since}</dt>
            <dd>{r.created_at ? dateLabel(r.created_at) : "—"}</dd>
          </div>
        </dl>
      </article>
    </li>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const f = parseUserFilters(await searchParams);
  const [data, me] = await Promise.all([loadUsers(f), getAdmin()]);
  if (!data) return <p className={styles.notice}>{adminCopy.errors.load}</p>;
  const self = me?.id ?? null;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  return (
    <>
      <form method="get" action="/admin/utenze" className={styles.filters} role="search" aria-label={copy.searchLabel}>
        <div className={styles.field}>
          <label htmlFor="q">{copy.searchLabel}</label>
          <input id="q" name="q" type="search" defaultValue={f.q} placeholder={copy.search} className={styles.input} autoComplete="off" />
        </div>
        {f.stato !== "all" ? <input type="hidden" name="stato" value={f.stato} /> : null}
        {f.view === "schede" ? <input type="hidden" name="vista" value="schede" /> : null}
        <button type="submit" className={styles.btn}>
          {copy.submit}
        </button>
        {f.q ? (
          <Link href={userHref(f, { q: "", page: 1 })} className={`${styles.btn} ${styles.btnLine}`}>
            {copy.reset}
          </Link>
        ) : null}
      </form>

      <nav aria-label={adminCopy.filters.label}>
        <ul className={styles.chips}>
          {USER_FILTERS.map((st) => (
            <li key={st}>
              <Link href={userHref(f, { stato: st, page: 1 })} className={styles.chip} aria-current={f.stato === st ? "true" : undefined}>
                {copy.filters[st]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.toolbar}>
        <p className={styles.label} role="status">
          {copy.found(data.total)}
        </p>
        <ViewToggle view={f.view} href={(v) => userHref(f, { view: v })} />
      </div>

      {data.rows.length === 0 ? (
        <p className={`${styles.tableWrap} ${styles.empty}`}>{copy.none}</p>
      ) : f.view === "schede" ? (
        <ul className={styles.gridCards}>
          {data.rows.map((r) => (
            <UserCard key={r.row_id} r={r} self={self} />
          ))}
        </ul>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <Sortable f={f} col="name">
                  {copy.cols.user}
                </Sortable>
                <th scope="col">{copy.cols.role}</th>
                <Sortable f={f} col="salon">
                  {copy.cols.salon}
                </Sortable>
                <th scope="col">{copy.cols.state}</th>
                <Sortable f={f} col="access">
                  {copy.cols.access}
                </Sortable>
                <Sortable f={f} col="created">
                  {copy.cols.since}
                </Sortable>
                <th scope="col" className={styles.actionsCell}>
                  <span className={styles.srOnly}>{copy.cols.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <Row key={r.row_id} r={r} self={self} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <nav className={styles.pager} aria-label="Pagine">
          {f.page > 1 ? (
            <Link href={userHref(f, { page: f.page - 1 })} className={`${styles.btn} ${styles.btnLine}`}>
              {adminCopy.list.prev}
            </Link>
          ) : (
            <span />
          )}
          <span className={styles.label}>{adminCopy.list.page(f.page, pages)}</span>
          {f.page < pages ? (
            <Link href={userHref(f, { page: f.page + 1 })} className={`${styles.btn} ${styles.btnLine}`}>
              {adminCopy.list.next}
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
      <div className={`${styles.head} ${styles.headRow}`}>
        <div>
          <h1>{copy.title}</h1>
          <p className={styles.lead}>{copy.lead}</p>
        </div>
        <AddAdmin />
      </div>
      <Suspense fallback={<p className={styles.lead}>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
