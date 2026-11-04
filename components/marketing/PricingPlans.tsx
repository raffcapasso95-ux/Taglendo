"use client";

import Link from "next/link";
import { useState } from "react";
import { marketingCopy } from "@/lib/copy/marketing";
import styles from "./Marketing.module.css";

const copy = marketingCopy.prices;

/** I due piani, con la scelta delle poltrone che evidenzia quello giusto. Si usa quando gli abbonamenti sono accesi (Fase 6). */
export function PricingPlans() {
  const [chairs, setChairs] = useState(1);
  return (
    <>
      <div className={styles.chairs} role="group" aria-label={copy.chairsGroup}>
        <span className={styles.chairsLabel}>{copy.chairsQuestion}</span>
        <div className={styles.seg}>
          {[1, 2, 3].map((c) => (
            <button key={c} type="button" className={styles.segButton} aria-pressed={chairs === c} onClick={() => setChairs(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.plans}>
        {copy.plans.map((p, i) => {
          const on = (chairs === 1) === (i === 0);
          return (
            <div key={p.name} className={on ? `${styles.plan} ${styles.planOn}` : styles.plan}>
              <div className={styles.planHead}>
                <div>
                  <h3 className={styles.planName}>{p.name}</h3>
                  <span className={styles.planWho}>{p.who}</span>
                </div>
                <span className={styles.badge}>{copy.forYou}</span>
              </div>
              <div className={styles.price}>
                <span className={styles.priceBig}>{p.price}</span>
                <span className={styles.planPer}>{copy.perMonth}</span>
              </div>
              <div className={styles.rows}>
                <div className={styles.row}><span>{copy.rows.ops}</span><strong>{p.ops}</strong></div>
                <div className={styles.row}><span>{copy.rows.fee}</span><strong>{copy.rows.none}</strong></div>
              </div>
              <Link href="/registrati" className={styles.planCta}>{copy.tryPlan(p.name)}</Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
