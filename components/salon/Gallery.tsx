"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { shopCopy } from "@/lib/copy/shop";
import styles from "./Shop.module.css";

type Photo = { url: string; alt: string };
const copy = shopCopy.gallery;

const Icon = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Le foto del salone: mosaico (una fila da scorrere su telefono) e visore a tutto schermo con frecce e tastiera. */
export function Gallery({ photos }: { photos: Photo[] }) {
  const [current, setCurrent] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const n = photos.length;

  const show = useCallback((i: number) => setCurrent(((i % n) + n) % n), [n]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => opener.current?.focus();
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  const photo = photos[current]!;
  return (
    <>
      <ul className={`${styles.gallery} ${styles[`gallery${Math.min(n, 8)}` as "gallery4"] ?? ""}`}>
        {photos.map((p, i) => (
          <li key={p.url} className={styles.shot}>
            <button
              type="button"
              className={styles.shotButton}
              aria-label={copy.open(i + 1, n, p.alt)}
              onClick={(e) => {
                opener.current = e.currentTarget;
                show(i);
                dialog.current?.showModal();
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.alt} width={900} height={675} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        className={styles.viewer}
        aria-label={copy.viewer}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") show(current - 1);
          if (e.key === "ArrowRight") show(current + 1);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={photo.alt} />
        <div className={styles.viewerBar}>
          <span className={styles.viewerText}>
            {copy.of(current + 1, n)} · {photo.alt}
          </span>
          <span className={styles.viewerButtons}>
            <button type="button" className={styles.viewerButton} aria-label={copy.prev} onClick={() => show(current - 1)}>
              <Icon d="m15 6-6 6 6 6" />
            </button>
            <button type="button" className={styles.viewerButton} aria-label={copy.next} onClick={() => show(current + 1)}>
              <Icon d="m9 6 6 6-6 6" />
            </button>
            <button type="button" className={styles.viewerButton} aria-label={copy.close} onClick={() => dialog.current?.close()}>
              <Icon d="M6 6l12 12M18 6 6 18" />
            </button>
          </span>
        </div>
      </dialog>
    </>
  );
}
