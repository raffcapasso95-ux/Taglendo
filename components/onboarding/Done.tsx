"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui";
import { onboardingCopy } from "@/lib/copy/onboarding";
import styles from "./Done.module.css";

const copy = onboardingCopy.done;

type Props = {
  salonName: string;
  /** Indirizzo completo da condividere. */
  url: string;
  /** Senza "https://", come nei design. */
  display: string;
  /** Data di fine prova, solo quando i pagamenti sono accesi; altrimenti beta gratuita. */
  trialEnds?: string;
};

export function Done({ salonName, url, display, trialEnds }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Senza permesso per gli appunti: si seleziona il testo a mano.
      const range = document.createRange();
      const node = document.getElementById("share-link");
      if (node) {
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: salonName, url });
        return;
      }
    } catch {
      return; // annullato dall'utente
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${salonName}: ${url}`)}`, "_blank", "noopener");
  };

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <span className={styles.check} aria-hidden="true">
          ✓
        </span>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 className={styles.title}>{copy.title}</h1>
        </div>
        <div className={styles.card}>
          <p className={styles.salon}>{salonName}</p>
          <p className={styles.link} id="share-link">
            {display}
          </p>
        </div>
        <div className={styles.buttons}>
          <Button size="large" fullWidth onClick={copyLink} aria-live="polite">
            {copied ? copy.copied : copy.copy}
          </Button>
          <Button size="large" variant="secondary" fullWidth onClick={share}>
            {copy.share}
          </Button>
        </div>
        <p className={styles.trial}>{trialEnds ? copy.trial(trialEnds) : copy.beta}</p>
        <ButtonLink href="/agenda" variant="secondary" size="large" fullWidth className={styles.agenda}>
          {copy.agenda}
        </ButtonLink>
      </div>
    </main>
  );
}
