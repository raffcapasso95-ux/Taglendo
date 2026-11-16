"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";
import { shopCopy } from "@/lib/copy/shop";
import page from "./Page.module.css";
import styles from "./Shop.module.css";

type Photo = { url: string; alt: string };
const copy = shopCopy.gallery;
/** Quante foto entrano nel mosaico; le altre si vedono nel visore («Vedi tutte le foto»). */
const MOSAIC = 5;

const Icon = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Le foto del salone: mosaico (carosello su telefono; lì si vedono tutte) e visore a tutto schermo con frecce e tastiera. */
export function Gallery({ photos }: { photos: Photo[] }) {
  const [current, setCurrent] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const n = photos.length;
  const shown = Math.min(n, MOSAIC);

  const show = useCallback((i: number) => setCurrent(((i % n) + n) % n), [n]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => opener.current?.focus();
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  const photo = photos[current]!;
  const sizeClass = shown < MOSAIC ? page[`mosaic${shown}` as "mosaic1"] : undefined;
  return (
    <>
      <ul className={cx(page.mosaic, sizeClass)}>
        {photos.map((p, i) => {
          const more = n > MOSAIC && i === MOSAIC - 1;
          return (
            <li key={p.url} className={i >= MOSAIC ? page.extra : undefined}>
              <button
                type="button"
                className={page.shot}
                aria-label={more ? copy.all(n) : copy.open(i + 1, n, p.alt)}
                onClick={(e) => {
                  opener.current = e.currentTarget;
                  show(i);
                  dialog.current?.showModal();
                }}
              >
                <Image src={p.url} alt={more ? "" : p.alt} width={900} height={675} sizes="(max-width: 960px) 50vw, 33vw" loading={i === 0 ? "eager" : "lazy"} />
                {more ? (
                  <span className={page.more} aria-hidden="true">
                    {copy.seeAll}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
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
        <Image src={photo.url} alt={photo.alt} width={1600} height={1200} sizes="100vw" />
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
