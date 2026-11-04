"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { marketingCopy } from "@/lib/copy/marketing";
import styles from "./Marketing.module.css";

type Props = { old: string; now: string; img: string; alt: string; index: number };

/** Una delle "tre cose che smetti di fare": la frase vecchia si barra quando entra nello schermo. */
export function Stop({ old, now, img, alt, index }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      const t = window.setTimeout(() => setSeen(true), 0);
      return () => window.clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.stop} data-seen={seen} style={{ ["--d" as string]: `${200 + index * 160}ms` }}>
      <div className={styles.stopText}>
        <span className={styles.eyebrowPeach}>{marketingCopy.stops.before}</span>
        <span className={styles.stopOld}>
          <span>{old}</span>
        </span>
        <span className={styles.stopNow}>
          <span className={styles.stopNowLabel}>{marketingCopy.stops.with}</span>
          {now}
        </span>
      </div>
      <Image src={img} alt={alt} width={900} height={675} sizes="(min-width: 820px) 220px, 100vw" className={`${styles.stopImg}`} />
    </div>
  );
}
