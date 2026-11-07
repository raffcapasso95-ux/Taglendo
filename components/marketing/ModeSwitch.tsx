"use client";

import { useState } from "react";
import { cx } from "@/components/ui/cx";
import { landCopy } from "@/lib/copy/land";
import styles from "./Land.module.css";

const copy = landCopy.modes;

const Phone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 4h3l1.5 4-2 1.3a11 11 0 0 0 7.2 7.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);

/** «Online o al telefono»: l'interruttore a due posizioni, la pillola scivola e cambiano testo e anteprima. */
export function ModeSwitch() {
  const [mode, setMode] = useState<"online" | "tel">("online");
  const tab = (m: "online" | "tel", label: string) => (
    <button type="button" role="tab" className={styles.segBtn} aria-selected={mode === m} aria-controls={`mode-${m}`} id={`tab-${m}`} onClick={() => setMode(m)}>
      {label}
    </button>
  );
  return (
    <>
      <div className={cx(styles.head, styles.reveal)} data-reveal="">
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h2 className={styles.h2} id="modalita-t">
          {copy.title}
        </h2>
        <p className={styles.p}>{copy.lead}</p>
        <div className={styles.seg} role="tablist" aria-label={copy.group} data-mode={mode}>
          <span className={styles.segPill} aria-hidden="true" />
          {tab("online", copy.online)}
          {tab("tel", copy.phone)}
        </div>
        <p className={styles.modeText} id="mode-online-text" hidden={mode !== "online"}>
          {copy.onlineText}
        </p>
        <p className={styles.modeText} id="mode-tel-text" hidden={mode !== "tel"}>
          {copy.phoneText}
        </p>
        <p className={styles.small}>{copy.note}</p>
      </div>
      <div className={cx(styles.modeDemo, styles.reveal)} data-reveal="">
        <div className={styles.modeCard}>
          <div className={styles.modeTop}>
            <span className={styles.modeAv}>{copy.initials}</span>
            <span>
              <strong>{copy.salon}</strong>
              <span>{copy.service}</span>
            </span>
            <strong className={styles.modePrice}>{copy.price}</strong>
          </div>
          <div className={styles.modePanel} id="mode-online" role="tabpanel" aria-labelledby="tab-online" hidden={mode !== "online"}>
            <span className={styles.modeLabel}>{copy.firstTimes}</span>
            <div className={styles.times}>
              {copy.times.map((t, i) => (
                <span key={t} className={cx(styles.time, i === 1 && styles.timeOn)}>
                  {t}
                </span>
              ))}
            </div>
            <span className={styles.fakeBtn}>{copy.book}</span>
          </div>
          <div className={styles.modePanel} id="mode-tel" role="tabpanel" aria-labelledby="tab-tel" hidden={mode !== "tel"}>
            <span className={styles.modeLabel}>{copy.toBook}</span>
            <span className={styles.callNumber}>{copy.phoneNumber}</span>
            <span className={styles.fakeBtn}>
              <Phone />
              {copy.call}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
