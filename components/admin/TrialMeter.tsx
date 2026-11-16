import { adminCopy } from "@/lib/copy/admin";
import type { SalonState } from "@/lib/admin/load";
import { dateLabel, daysLeft } from "./format";
import styles from "./Admin.module.css";

const c = adminCopy.trial;

type Props = {
  state: SalonState;
  trialEndsAt: string;
  createdAt: string;
  size?: "sm" | "lg";
};

/** I giorni di prova che restano, con una barra: si vede a colpo d'occhio chi sta per scadere. */
export function TrialMeter({ state, trialEndsAt, createdAt, size = "sm" }: Props) {
  if (state !== "trialing") {
    const text = state === "active" ? c.active : state === "suspended" ? c.suspended : state === "incomplete" ? c.incomplete : c.expired;
    const tone = state === "active" ? styles.meterOk : state === "expired" ? styles.meterBad : styles.meterMuted;
    return (
      <div className={`${styles.meter} ${size === "lg" ? styles.meterLg : ""} ${tone}`}>
        <span className={styles.meterTop}>
          <span className={styles.meterLabel}>{c.label}</span>
          <strong className={styles.meterValue}>{text}</strong>
        </span>
        {state === "expired" ? <span className={styles.meterHint}>{c.expiredSince(dateLabel(trialEndsAt))}</span> : null}
      </div>
    );
  }
  const left = Math.max(0, daysLeft(trialEndsAt));
  const total = Math.max(left, 1, Math.round((new Date(trialEndsAt).getTime() - new Date(createdAt).getTime()) / 86400000));
  const pct = Math.min(100, Math.max(4, (left / total) * 100));
  const soon = left <= 3;
  return (
    <div className={`${styles.meter} ${size === "lg" ? styles.meterLg : ""} ${soon ? styles.meterSoon : ""}`}>
      <span className={styles.meterTop}>
        <span className={styles.meterLabel}>{c.label}</span>
        <strong className={styles.meterValue}>
          {size === "lg" ? <span className={styles.meterBig}>{left}</span> : null}
          {size === "lg" ? (left === 1 ? " giorno" : " giorni") : c.daysLeft(left)}
          {size === "lg" ? ` ${c.left}` : ""}
        </strong>
      </span>
      <span className={styles.meterBar} role="img" aria-label={`${c.daysLeft(left)} ${c.left}`}>
        <span className={styles.meterFill} style={{ width: `${pct}%` }} />
      </span>
      {size === "lg" ? <span className={styles.meterHint}>{c.endsOn(dateLabel(trialEndsAt))}</span> : null}
    </div>
  );
}
