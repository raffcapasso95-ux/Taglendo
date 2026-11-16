import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Icon } from "@/components/admin/Icons";
import { RowMenu } from "@/components/admin/RowMenu";
import { TrialMeter } from "@/components/admin/TrialMeter";
import { ViewToggle } from "@/components/admin/ViewToggle";
import { agoLabel, stateBadge } from "@/components/admin/format";
import styles from "@/components/admin/Admin.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { PAGE_SIZE, SORTS, STATES, listHref, loadOverview, loadSalons, parseFilters, type Filters, type Overview, type SalonRow } from "@/lib/admin/load";
import { adminCopy } from "@/lib/copy/admin";

const copy = adminCopy.list;

type Params = { vista?: string | string[]; q?: string | string[]; stato?: string | string[]; ordina?: string | string[]; dir?: string | string[]; pagina?: string | string[] };

const TONE = { ok: styles.bOk, warn: styles.bWarn, bad: styles.bBad, plain: "" } as const;
const SORT_LABEL = { created: "Più recenti", name: "Nome", city: "Città", activity: "Attività", appointments: "Appuntamenti" } as const;

function menuOf(r: SalonRow) {
  return <RowMenu salon={{ id: r.id, name: r.name, slug: r.slug, hidden: r.admin_hidden, suspended: Boolean(r.suspended_at) }} />;
}

function Badges({ r }: { r: SalonRow }) {
  const badge = stateBadge(r);
  return (
    <span className={styles.badges}>
      <span className={`${styles.badge} ${TONE[badge.tone]}`}>{badge.text}</span>
      {r.admin_hidden ? (
        <span className={styles.badge}>
          <Icon name="eyeOff" size={13} />
          {adminCopy.badges.hidden}
        </span>
      ) : null}
    </span>
  );
}

function Name({ r, owner = false }: { r: SalonRow; owner?: boolean }) {
  return (
    <span className={styles.nameCell}>
      <Avatar name={r.name} size="md" />
      <span className={styles.nameText}>
        <Link href={`/admin/saloni/${r.id}`} className={styles.rowLink}>
          {r.name}
        </Link>
        <span className={styles.sub}>{[r.city, r.slug].filter(Boolean).join(" · ")}</span>
        {owner ? <span className={`${styles.sub} ${styles.showMid}`}>{r.owner_name ?? "—"}</span> : null}
      </span>
    </span>
  );
}

function SalonCard({ r }: { r: SalonRow }) {
  return (
    <li>
      <article className={styles.sCard}>
        <div className={styles.sCardHead}>
          <Name r={r} />
          {menuOf(r)}
        </div>
        <Badges r={r} />
        <TrialMeter state={r.state} trialEndsAt={r.trial_ends_at} createdAt={r.created_at} />
        <ul className={styles.stats}>
          <li title={copy.cols.appts}>
            <Icon name="calendar" size={16} />
            <strong>{r.appts}</strong> <span>{copy.last30(r.appts30)}</span>
          </li>
          <li title={copy.barbers(r.members)}>
            <Icon name="users" size={16} />
            <strong>{r.members}</strong> <span>{r.members === 1 ? "barbiere" : "barbieri"}</span>
          </li>
          <li title={copy.cols.last}>
            <Icon name="pulse" size={16} />
            <span>{agoLabel(r.last_activity)}</span>
          </li>
        </ul>
        <p className={styles.owner}>
          <strong>{r.owner_name ?? "—"}</strong>
          <span className={styles.sub}>{r.owner_email ?? ""}</span>
        </p>
      </article>
    </li>
  );
}

function Row({ r }: { r: SalonRow }) {
  return (
    <tr>
      <td data-label={copy.cols.salon}>
        <Name r={r} owner />
      </td>
      <td data-label={copy.cols.owner} className={styles.hideMid}>
        <span>
          {r.owner_name ?? "—"}
          <span className={styles.sub}>{r.owner_email ?? ""}</span>
        </span>
      </td>
      <td data-label={copy.cols.state}>
        <Badges r={r} />
      </td>
      <td data-label={adminCopy.trial.label} className={styles.meterCell}>
        <TrialMeter state={r.state} trialEndsAt={r.trial_ends_at} createdAt={r.created_at} />
      </td>
      <td data-label={copy.cols.appts}>
        <span className={styles.num}>
          {r.appts}
          <span className={`${styles.sub} ${styles.subWrap}`}>
            {copy.last30(r.appts30)} · {agoLabel(r.last_activity)}
          </span>
        </span>
      </td>
      <td data-label="" className={styles.actionsCell}>
        {menuOf(r)}
      </td>
    </tr>
  );
}

function countOf(o: Overview | null, s: (typeof STATES)[number]): number | null {
  if (!o) return null;
  const map = { all: o.salons, trialing: o.trialing, active: o.active, expired: o.expired, suspended: o.suspended, incomplete: o.incomplete, hidden: o.hidden, blocked: o.blocked } as const;
  return map[s];
}

function SortBar({ f }: { f: Filters }) {
  return (
    <nav className={styles.sortBar} aria-label="Ordina per">
      <span className={styles.label}>Ordina per</span>
      {SORTS.map((s) => {
        const on = f.sort === s;
        return (
          <Link key={s} href={listHref(f, { sort: s, dir: on && f.dir === "desc" ? "asc" : "desc", page: 1 })} aria-current={on ? "true" : undefined} className={styles.sortPill}>
            {SORT_LABEL[s]}
            {on ? (f.dir === "asc" ? " ↑" : " ↓") : ""}
          </Link>
        );
      })}
    </nav>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
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
        {f.view === "tabella" ? <input type="hidden" name="vista" value="tabella" /> : null}
        <button type="submit" className={styles.btn}>
          <Icon name="search" />
          {copy.submit}
        </button>
        {filtered ? (
          <Link href={listHref({ ...f, q: "", stato: "all" }, { page: 1 })} className={`${styles.btn} ${styles.btnLine}`}>
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
        <SortBar f={f} />
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
                <th scope="col">{copy.cols.salon}</th>
                <th scope="col" className={styles.hideMid}>{copy.cols.owner}</th>
                <th scope="col">{copy.cols.state}</th>
                <th scope="col">{adminCopy.trial.label}</th>
                <th scope="col">{copy.cols.appts}</th>
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
        <p className={styles.lead}>Tutti i saloni su Taglendo: giorni di prova, stato e azioni veloci.</p>
      </div>
      <Suspense fallback={<p className={styles.lead}>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
