import styles from "./Admin.module.css";

type Point = { day: string; n: number; online?: number };

const short = (d: string) => new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d.slice(0, 10)}T12:00:00Z`));

/** Un grafico a barre degli ultimi giorni, disegnato in scala: ogni barra ha il suo valore (nome accessibile). */
export function BarChart({ title, data, altLabel }: { title: string; data: Point[]; altLabel?: string }) {
  const max = Math.max(1, ...data.map((p) => p.n));
  const W = 300;
  const H = 90;
  const gap = 2;
  const bw = (W - gap * (data.length - 1)) / Math.max(1, data.length);
  const total = data.reduce((a, p) => a + p.n, 0);
  return (
    <figure className={styles.chart} aria-label={`${title}: ${total} in tutto`} style={{ margin: 0 }}>
      <h3>{title}</h3>
      <svg className={styles.chartSvg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}, ${total} in tutto`}>
        {data.map((p, i) => {
          const h = (p.n / max) * (H - 4);
          const hOnline = p.online ? (p.online / max) * (H - 4) : 0;
          const x = i * (bw + gap);
          return (
            <g key={p.day}>
              <title>{`${short(p.day)}: ${p.n}`}</title>
              <rect className={styles.bar1} x={x} y={H - h} width={bw} height={Math.max(h, p.n ? 1 : 0)} rx={1.5} />
              {hOnline ? <rect className={styles.bar2} x={x} y={H - hOnline} width={bw} height={hOnline} rx={1.5} /> : null}
            </g>
          );
        })}
      </svg>
      <div className={styles.axis}>
        <span>{data[0] ? short(data[0].day) : ""}</span>
        <span className={styles.num}>massimo {max}</span>
        <span>{data.at(-1) ? short(data.at(-1)!.day) : ""}</span>
      </div>
      {altLabel ? (
        <div className={styles.legend}>
          <span>
            <i className={styles.dot} />
            Tutti
          </span>
          <span>
            <i className={`${styles.dot} ${styles.dotAlt}`} />
            {altLabel}
          </span>
        </div>
      ) : null}
    </figure>
  );
}
