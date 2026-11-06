"use client";

import { useEffect, useRef } from "react";

/** Il grande «0 €»: quando arriva sullo schermo scende da `from` a 0, a scatti. Senza JavaScript o con movimento ridotto resta 0. */
export function Ticker({ from, className }: { from: number; className?: string }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let n = from;
    let timer: number | undefined;
    node.textContent = String(n);
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        const step = () => {
          n = Math.max(0, n - Math.ceil(n / 4));
          node.textContent = String(n);
          if (n > 0) timer = window.setTimeout(step, 70);
        };
        step();
      },
      { threshold: 0.6 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [from]);

  return (
    <span ref={el} className={className} suppressHydrationWarning>
      0
    </span>
  );
}
