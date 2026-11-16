import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SalonActionBar } from "@/components/admin/SalonActionBar";
import { SalonActions } from "@/components/admin/SalonActions";
import { agoLabel, clock, dateLabel, dateTimeLabel, money, stateBadge } from "@/components/admin/format";
import styles from "@/components/admin/Admin.module.css";
import { loadSalon, type SalonDetail } from "@/lib/admin/load";
import { adminCopy } from "@/lib/copy/admin";

const d = adminCopy.detail;
const TONE = { ok: styles.bOk, warn: styles.bWarn, bad: styles.bBad, plain: "" } as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function stateOf(s: SalonDetail["salon"]) {
  const state = s.suspended_at ? "suspended" : s.onboarding_step < 5 ? "incomplete" : s.sub_status === "active" ? "active" : new Date(s.trial_ends_at).getTime() > Date.now() ? "trialing" : "expired";
  return stateBadge({ state, trial_ends_at: s.trial_ends_at });
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // le date relative («ieri», «scade domani») dipendono dal momento
  const { id } = await params;
  const data = await loadSalon(id);
  if (!data) notFound();
  const { salon: s, members, services, hours, counts, notes, audit } = data;
  const badge = stateOf(s);
  const n = d.numbers;
  return (
    <>
      <Link href="/admin/saloni" className={styles.back}>
        ← {d.back}
      </Link>
      <div className={styles.titleRow}>
        <h1>{s.name}</h1>
        <span className={styles.badges}>
          <span className={`${styles.badge} ${TONE[badge.tone]}`}>{badge.text}</span>
          {s.admin_hidden ? <span className={styles.badge}>{adminCopy.badges.hidden}</span> : null}
        </span>
      </div>
      <SalonActionBar id={s.id} name={s.name} hidden={s.admin_hidden} suspended={Boolean(s.suspended_at)} />
      {s.suspended_at ? null : (
        <p>
          <Link href={`/${s.slug}`} className={styles.rowLink} target="_blank" rel="noopener">
            {d.publicPage}
          </Link>
        </p>
      )}

      <div className={styles.cols}>
        <div className={styles.stack}>
          <section className={styles.panel} aria-labelledby="h-stato">
            <h2 id="h-stato">{d.sections.state}</h2>
            <dl className={styles.dl}>
              <Row label={d.plan}>{s.plan} · {s.sub_status}</Row>
              <Row label={d.trialUntil}>{dateLabel(s.trial_ends_at)}</Row>
              <Row label={d.since}>{dateLabel(s.created_at)}</Row>
              <Row label={d.onboarding}>{s.onboarding_step >= 5 ? d.onboardingDone : d.onboardingAt(s.onboarding_step)}</Row>
              <Row label={d.inSearch}>{s.listed ? d.yes : d.no}</Row>
              <Row label={d.bookingOnline}>{s.booking_online ? d.on : d.off}</Row>
              <Row label={d.rules}>{d.rulesText(s.min_notice_min, s.max_advance_days, s.slot_step_min)}</Row>
              {s.suspended_at ? <Row label={d.suspendedAt(dateLabel(s.suspended_at))}>{s.suspended_reason ?? "—"}</Row> : null}
            </dl>
          </section>

          <section className={styles.panel} aria-labelledby="h-contatti">
            <h2 id="h-contatti">{d.sections.contacts}</h2>
            <dl className={styles.dl}>
              <Row label={d.phone}>{s.phone || "—"}</Row>
              <Row label={d.address}>{s.address || "—"}</Row>
              <Row label={d.city}>{[s.area, s.city].filter(Boolean).join(", ") || "—"}</Row>
              <Row label={d.instagram}>{s.instagram || "—"}</Row>
            </dl>
          </section>

          <section className={styles.panel} aria-labelledby="h-barbieri">
            <h2 id="h-barbieri">{d.sections.members}</h2>
            <ul className={styles.list}>
              {members.map((m) => (
                <li key={m.id}>
                  <strong>{m.name}</strong>
                  {m.email ? <span className={styles.sub}>{m.email}</span> : null}
                  <span className={styles.badges}>
                    {m.role === "owner" ? <span className={styles.badge}>{adminCopy.badges.owner}</span> : null}
                    <span className={styles.badge}>{!m.active ? d.member.inactive : m.accepted ? d.member.accepted : d.member.invited}</span>
                    <span className={styles.badge}>{m.bookable_online ? d.member.online : d.member.offline}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.panel} aria-labelledby="h-servizi">
            <h2 id="h-servizi">{d.sections.services}</h2>
            {services.length === 0 ? (
              <p className={styles.muted}>{d.noServices}</p>
            ) : (
              <ul className={styles.list}>
                {services.map((v, i) => (
                  <li key={i}>
                    <strong>{v.name}</strong>
                    <span className={styles.sub}>
                      {v.duration_min} min · {money(v.price_cents)}
                      {v.active ? "" : " · non attivo"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="h-orari">
            <h2 id="h-orari">{d.sections.hours}</h2>
            {hours.length === 0 ? (
              <p className={styles.muted}>{d.noHours}</p>
            ) : (
              <dl className={styles.dl}>
                {[1, 2, 3, 4, 5, 6, 0].map((w) => {
                  const h = hours.find((x) => x.weekday === w);
                  return (
                    <Row key={w} label={d.days[w]!}>
                      {!h || h.closed || h.ranges.length === 0 ? d.closed : h.ranges.map(([a, b]) => `${clock(a)}–${clock(b)}`).join(" · ")}
                    </Row>
                  );
                })}
              </dl>
            )}
          </section>
        </div>

        <div className={styles.stack}>
          <SalonActions id={s.id} />

          <section className={styles.panel} aria-labelledby="h-numeri">
            <h2 id="h-numeri">{d.sections.numbers}</h2>
            <dl className={styles.dl}>
              <Row label={n.clients}>{counts.clients}</Row>
              <Row label={n.appointments}>{counts.appointments}</Row>
              <Row label={n.upcoming}>{counts.upcoming}</Row>
              <Row label={n.last30}>{counts.last30}</Row>
              <Row label={n.online}>{counts.online}</Row>
              <Row label={n.online30}>{counts.online30}</Row>
              <Row label={n.cancelled}>{counts.cancelled}</Row>
              <Row label={n.noShow}>{counts.no_show}</Row>
              <Row label={d.lastActivity}>{agoLabel(data.last_activity)}</Row>
            </dl>
            <p className={`${styles.hint} ${styles.muted}`}>{d.privacy}</p>
          </section>

          <section className={styles.panel} aria-labelledby="h-note">
            <h2 id="h-note">{d.sections.notes}</h2>
            {notes.length === 0 ? (
              <p className={styles.muted}>{d.noNotes}</p>
            ) : (
              <ul className={styles.list}>
                {notes.map((x) => (
                  <li key={x.id}>
                    <span>{x.body}</span>
                    <span className={styles.sub}>
                      {dateTimeLabel(x.created_at)}
                      {x.author ? ` · ${x.author}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="h-registro">
            <h2 id="h-registro">{d.sections.audit}</h2>
            {audit.length === 0 ? (
              <p className={styles.muted}>{d.noAudit}</p>
            ) : (
              <ul className={styles.list}>
                {audit.map((a, i) => (
                  <li key={i}>
                    <strong>{adminCopy.audit[a.action] ?? a.action}</strong>
                    <span className={styles.sub}>
                      {dateTimeLabel(a.created_at)}
                      {a.admin ? ` · ${a.admin}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className={styles.lead}>…</p>}>
      <Content params={params} />
    </Suspense>
  );
}
