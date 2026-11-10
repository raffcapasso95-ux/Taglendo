"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { tourCopy as copy, type TourStep } from "@/lib/copy/tour";
import { markTourSeen } from "@/lib/tour/actions";
import styles from "./Tour.module.css";

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 6;

/** Il primo elemento visibile con questo `data-tour` (telefono e computer hanno copie diverse nel DOM). */
function findTarget(name: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

const isPhone = () => window.matchMedia("(max-width: 1023px)").matches;

/**
 * NUOVO: la guida al primo accesso in agenda. Un saluto, poi un passo per ogni cosa che si può fare,
 * con l'elemento messo in luce e un riquadro che spiega. Si salta in ogni momento (anche con Esc);
 * finita o saltata non si ripropone (dati dell'account). Si rivede da Impostazioni › Aiuto (?guida=1).
 */
export function AgendaTour({ firstName, show }: { firstName: string; show: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState(show);
  /** -1 = saluto; poi gli indici in `steps`; steps.length = fine. */
  const [at, setAt] = useState(-1);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = at >= 0 && at < steps.length ? steps[at]! : null;

  // l'elemento del passo: lo porta in vista e ne misura la posizione (anche scorrendo o ridimensionando)
  useEffect(() => {
    if (!open) return;
    const target = step?.target ? findTarget(step.target) : null;
    if (target) target.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = target?.getBoundingClientRect();
        setRect(r ? { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } : null);
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, at]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    void markTourSeen();
    if (search.get("guida")) router.replace(pathname, { scroll: false });
  };

  const begin = () => {
    const phone = isPhone();
    const list = copy.steps.filter((s) => !(s.phoneOnly && !phone) && !(s.desktopOnly && phone) && (!s.target || findTarget(s.target)));
    setSteps(list);
    setAt(0);
  };

  const welcome = copy.welcome(firstName);
  const title = at === -1 ? welcome.title : step ? step.title : copy.end.title;
  const body = at === -1 ? welcome.body : step ? step.body : copy.end.body;

  // il riquadro sta sotto l'elemento se c'è spazio, altrimenti sopra; senza elemento è al centro
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const cardW = Math.min(360, vw - 32);
  let cardStyle: React.CSSProperties | undefined;
  if (step && rect) {
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16);
    const below = rect.top + rect.height + 12;
    cardStyle = below + 200 < vh ? { top: below, left, width: cardW } : { bottom: vh - rect.top + 12, left, width: cardW };
  }

  return (
    <div className={styles.layer} role="dialog" aria-modal="true" aria-label={copy.label} onKeyDown={(e) => e.key === "Escape" && close()}>
      {step && rect ? (
        <div className={styles.spot} style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} aria-hidden="true" />
      ) : (
        <div className={styles.dim} aria-hidden="true" />
      )}
      <div ref={cardRef} tabIndex={-1} className={step && rect ? styles.card : `${styles.card} ${styles.cardCenter}`} style={cardStyle} aria-live="polite">
        {step ? <p className={styles.progress}>{copy.progress(at + 1, steps.length)}</p> : null}
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.body}>{body}</p>
        <div className={styles.actions}>
          {at === -1 ? (
            <>
              <button type="button" className={styles.skip} onClick={close}>
                {copy.skip}
              </button>
              <Button onClick={begin}>{copy.start}</Button>
            </>
          ) : step ? (
            <>
              <button type="button" className={styles.skip} onClick={close}>
                {copy.skip}
              </button>
              <span className={styles.nav}>
                {at > 0 ? (
                  <Button variant="secondary" onClick={() => setAt(at - 1)}>
                    {copy.back}
                  </Button>
                ) : null}
                <Button onClick={() => setAt(at + 1)}>{copy.next}</Button>
              </span>
            </>
          ) : (
            <Button onClick={close}>{copy.done}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
