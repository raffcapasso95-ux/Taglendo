"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { marketingCopy } from "@/lib/copy/marketing";
import styles from "./Marketing.module.css";

const copy = marketingCopy.before;
const clamp = (n: number) => Math.max(4, Math.min(96, n));

/** "Prima e dopo": a sinistra il quaderno, a destra l'agenda; si trascina la maniglia o si usano le frecce. */
export function BeforeAfter({ extra }: { extra?: { root?: string; paper?: string; handle?: string; tagLeft?: string; tagRight?: string } } = {}) {
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [pos, setPos] = useState(50);

  const setFrom = (e: PointerEvent<HTMLDivElement>) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setPos(clamp(((e.clientX - r.left) / r.width) * 100));
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setPos((p) => clamp(p + (e.key === "ArrowLeft" ? -5 : 5)));
  };

  return (
    <div
      ref={box}
      className={[styles.compare, extra?.root].filter(Boolean).join(" ")}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setFrom(e);
      }}
      onPointerMove={(e) => dragging.current && setFrom(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <picture className={styles.compareAfter}>
        <source media="(min-width: 820px)" srcSet="/images/shot-agenda-desktop.png" />
        <img src="/images/shot-agenda-mobile.png" alt={copy.afterAlt} draggable={false} width={780} height={1688} loading="lazy" decoding="async" />
      </picture>
      <div className={[styles.paper, extra?.paper].filter(Boolean).join(" ")} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <div className={styles.paperMargin} />
        <span className={styles.paperTitle}>{copy.day}</span>
        {copy.paper.map(([t, x, note, struck], i) => (
          <div key={t} className={styles.paperRow} style={{ transform: `rotate(${((i % 3) - 1) * 0.6}deg)` }}>
            <span className={styles.paperTime}>{t}</span>
            <span className={struck ? styles.struck : undefined}>{x}</span>
            <span className={styles.paperNote}>{note}</span>
          </div>
        ))}
      </div>
      <span className={`${styles.tag} ${extra?.tagLeft ?? styles.tagLeft}`} style={{ opacity: pos > 16 ? 1 : 0 }}>{copy.notebook}</span>
      <span className={`${styles.tag} ${extra?.tagRight ?? styles.tagRight}`} style={{ opacity: pos < 84 ? 1 : 0 }}>{copy.app}</span>
      <div className={styles.line} style={{ left: `${pos}%` }} />
      <button
        type="button"
        role="slider"
        className={[styles.handle, extra?.handle].filter(Boolean).join(" ")}
        style={{ left: `${pos}%` }}
        aria-label={copy.handle}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={onKey}
      >
        ↔
      </button>
    </div>
  );
}
