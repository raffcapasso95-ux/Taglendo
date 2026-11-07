import Link from "next/link";
import { OperatorAvatar } from "@/components/agenda/OperatorAvatar";
import { Avatar } from "@/components/ui/Avatar";
import { cx } from "@/components/ui/cx";
import { formatPrice } from "@/lib/dates/format";
import type { StatsModel } from "@/lib/stats/load";
import { PERIODS, PERIOD_LABEL } from "@/lib/rules/stats";
import styles from "./Stats.module.css";

const NBSP = /\s/g;
const nb = (s: string) => s.replace(NBSP, "\u00a0");
const Chevron = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const PRIVACY = "Contano gli appuntamenti completati, al prezzo fatto. Le vede solo il titolare.";

export function StatsView({ m }: { m: StatsModel }) {
  const isDay = m.period === "giorno";
  const prevLabel = isDay ? "Giorno precedente" : "Periodo precedente";
  const nextLabel = isDay ? "Giorno successivo" : "Periodo successivo";
  return (
    <main className={cx(styles.page, styles.simple)}>
      <header className={styles.head}>
        <h1 className={styles.title}>Statistiche</h1>
        <nav className={styles.periods} aria-label="Periodo">
          {PERIODS.map((p) => (
            <Link key={p} className={cx(styles.period, p === m.period && styles.periodOn)} href={p === "mese" ? "/statistiche" : `/statistiche?periodo=${p}`} aria-current={p === m.period ? "page" : undefined}>
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </nav>
      </header>

      <section className={styles.hero} aria-label={m.heroLabel}>
        <div className={styles.heroTop}>
          <Link href={m.prevHref} className={cx(styles.navButton, styles.navOnDark)} aria-label={prevLabel}>
            <Chevron d="m15 6-6 6 6 6" />
          </Link>
          <p className={styles.periodLabel}>{m.title}</p>
          {m.nextHref ? (
            <Link href={m.nextHref} className={cx(styles.navButton, styles.navOnDark)} aria-label={nextLabel}>
              <Chevron d="m9 6 6 6-6 6" />
            </Link>
          ) : (
            <span className={cx(styles.navButton, styles.navOnDark, styles.navDisabled)} aria-hidden="true">
              <Chevron d="m9 6 6 6-6 6" />
            </span>
          )}
        </div>
        <div className={styles.heroMain}>
          <div className={styles.heroFigure}>
            <p className={styles.heroLabel}>{m.heroLabel}</p>
            <p className={styles.heroValue}>{nb(m.revenue)}</p>
            {m.delta ? (
              <span className={cx(styles.delta, m.delta.up ? styles.up : styles.down)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={m.delta.up ? "M12 19V5M6 11l6-6 6 6" : "M12 5v14M6 13l6 6 6-6"} />
                </svg>
                {m.delta.text}
              </span>
            ) : null}
          </div>
          <dl className={styles.heroStats}>
            {m.stats.map((s) => (
              <div key={s.label} className={styles.heroStat}>
                <dt>{s.label}</dt>
                <dd>{nb(s.value)}</dd>
              </div>
            ))}
          </dl>
        </div>
        {m.chart ? (
          <>
            <figure className={styles.area}>
              <svg viewBox="0 0 300 90" preserveAspectRatio="none" role="img" aria-label={m.chart.label}>
                <path className={styles.areaFill} d={m.chart.fill} />
                <path className={styles.areaLine} d={m.chart.line} vectorEffect="non-scaling-stroke" />
              </svg>
              <figcaption className={styles.areaAxis}>
                <span>{m.chart.from}</span>
                <span>{m.chart.to}</span>
              </figcaption>
            </figure>
            {m.chart.note ? (
              <p className={styles.areaNote}>
                {m.chart.note.label} <strong>{m.chart.note.strong}</strong> · {nb(m.chart.note.value)}
              </p>
            ) : null}
          </>
        ) : null}
        {m.note ? <p className={styles.areaNote}>{m.note}</p> : null}
      </section>

      <div className={cx(styles.pair, isDay && styles.pairDay)}>
        {m.operators ? (
          <section className={styles.card} aria-labelledby="op-title">
            <h2 id="op-title" className={styles.cardTitle}>
              Per operatore
            </h2>
            <ul className={styles.ops}>
              {m.operators.map((o) => (
                <li key={o.id} className={styles.op}>
                  <OperatorAvatar name={o.name} colorIndex={o.color} />
                  <div className={styles.opMain}>
                    <div className={styles.opTop}>
                      <span className={styles.opName}>{o.name}</span>
                      <span className={styles.opValue}>{nb(o.value)}</span>
                    </div>
                    <span className={styles.track} aria-hidden="true">
                      <span className={styles.trackFill} style={{ "--v": `${o.fill}%` } as React.CSSProperties} />
                    </span>
                    <span className={styles.opSub}>{o.sub}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {isDay && m.day ? (
          <section className={styles.card} aria-labelledby="day-title">
            <div className={styles.cardHead}>
              <h2 id="day-title" className={styles.cardTitle}>
                Tutti gli appuntamenti
              </h2>
              <span className={styles.cardNote}>{m.day.rows.length} in agenda</span>
            </div>
            <ol className={cx(styles.rank, styles.dayList)}>
              {m.day.rows.map((r) => {
                const muted = r.status === "annullato" || r.status === "non_presentato";
                const discounted = r.listPriceCents != null && r.listPriceCents > r.priceCents;
                return (
                  <li key={r.id} className={cx(styles.rankRow, muted && styles.rowMuted)}>
                    <span className={styles.dayTime}>{r.time}</span>
                    <Avatar name={r.clientName} color={r.avatarColor} photoUrl={r.photoUrl} size="md" />
                    <span className={styles.rankText}>
                      <span className={styles.rankName}>{r.clientName}</span>
                      <span className={styles.rankSub}>{r.sub}</span>
                    </span>
                    {r.status === "non_presentato" ? (
                      <span className={cx(styles.badge, styles.badgeNoShow)}>Non presentato</span>
                    ) : r.status === "annullato" ? (
                      <span className={cx(styles.badge, styles.badgeCanceled)}>Annullato</span>
                    ) : discounted ? (
                      <span className={styles.priceCol}>
                        <s className={styles.priceOld}>{nb(formatPrice(r.listPriceCents!))}</s>
                        <span className={cx(styles.rankValue, styles.priceDisc)}>{nb(formatPrice(r.priceCents))}</span>
                      </span>
                    ) : (
                      <span className={styles.rankValue}>{nb(formatPrice(r.priceCents))}</span>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className={styles.dayTotal}>
              <span>Totale incassato</span>
              <strong>{nb(m.day.total)}</strong>
            </div>
            <a className={styles.share} href={m.day.whatsapp} target="_blank" rel="noopener noreferrer">
              Invia il resoconto su WhatsApp
            </a>
          </section>
        ) : (
          <section className={styles.card} aria-labelledby="top-title">
            <h2 id="top-title" className={styles.cardTitle}>
              Top clienti
            </h2>
            {m.top.length > 0 ? (
              <ol className={styles.rank}>
                {m.top.map((t) => (
                  <li key={t.id} className={styles.rankRow}>
                    <Avatar name={t.name} color={t.color} photoUrl={t.photoUrl} size="md" />
                    <span className={styles.rankText}>
                      <Link className={styles.rankName} href={`/clienti/${t.id}`}>
                        {t.name}
                      </Link>
                      <span className={styles.rankSub}>{t.sub}</span>
                    </span>
                    <span className={styles.rankValue}>{nb(t.value)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.rankSub}>Ancora nessun cliente in questo periodo.</p>
            )}
          </section>
        )}
      </div>
      <p className={styles.privacy}>{PRIVACY}</p>
    </main>
  );
}
