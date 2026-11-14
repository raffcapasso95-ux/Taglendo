"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cx } from "@/components/ui/cx";
import { searchCopy } from "@/lib/copy/search";
import { searchHref } from "@/lib/search/rules";

const copy = searchCopy;

/** «Vicino a me»: chiede la posizione al telefono e porta ai risultati; se non si può, lo dice. */
export function NearMeButton({ className }: { className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "denied">("idle");
  const go = () => {
    if (!("geolocation" in navigator)) return setState("denied");
    setState("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => router.push(searchHref({ lat: pos.coords.latitude, lng: pos.coords.longitude })),
      () => setState("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };
  return (
    <span>
      <button type="button" className={cx(className)} onClick={go} disabled={state === "busy"} aria-describedby={state === "denied" ? "near-denied" : undefined}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
        {state === "busy" ? copy.box.locating : copy.home.nearMe}
      </button>
      {state === "denied" ? (
        <span id="near-denied" role="alert" style={{ display: "block", marginTop: "var(--space-2)", fontSize: 14, color: "var(--text-secondary)" }}>
          {copy.box.denied}
        </span>
      ) : null}
    </span>
  );
}
