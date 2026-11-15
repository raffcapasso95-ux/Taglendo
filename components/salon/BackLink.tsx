"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { shopCopy } from "@/lib/copy/shop";
import { lastSearch } from "@/lib/search/lastSearch";

const copy = shopCopy.page;
const subscribe = () => () => {};

/**
 * «Torna ai risultati» se si arriva da una ricerca (la stessa, con i suoi filtri); altrimenti «Torna alla home».
 * Sul server e al primo disegno è la home: poi, nel browser, si legge l'ultima ricerca di questa scheda.
 */
export function BackLink({ className }: { className?: string }) {
  const href = useSyncExternalStore(subscribe, () => lastSearch(), () => null);
  return (
    <Link href={href ?? "/"} className={className} data-back={href ? "results" : "home"}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 6-6 6 6 6" />
      </svg>
      {href ? copy.backResults : copy.backHome}
    </Link>
  );
}
