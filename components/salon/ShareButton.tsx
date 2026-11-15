"use client";

import { useEffect, useRef, useState } from "react";

/** «Condividi»: il pannello di condivisione del telefono; dove non c'è, copia l'indirizzo della pagina. */
export function ShareButton({ title, className, labelClassName }: { title: string; className?: string; labelClassName?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const share = async () => {
    const url = window.location.href.split("#")[0]!;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // annullato dal cliente: niente da fare
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copia l’indirizzo della pagina", url);
    }
  };

  return (
    <button type="button" className={className} onClick={share} aria-label={copied ? "Indirizzo copiato" : "Condividi"}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 15V4M8 8l4-4 4 4" />
        <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
      <span className={labelClassName} aria-live="polite">
        {copied ? "Copiato" : "Condividi"}
      </span>
    </button>
  );
}
