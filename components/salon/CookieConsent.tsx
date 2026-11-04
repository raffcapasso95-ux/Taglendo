"use client";

import { useState, useSyncExternalStore } from "react";
import { publicCopy } from "@/lib/copy/publicPage";
import styles from "./Salon.module.css";

const COOKIE = "tg_cookie";
type Choice = "necessari" | "tutti";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
/** "server" finché la pagina non è nel browser: così banner e pagina coincidono al primo disegno. */
const snapshot = (): Choice | "unset" => readChoice() ?? "unset";
const serverSnapshot = (): "server" => "server";

function readChoice(): Choice | null {
  const value = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`))?.split("=")[1];
  return value === "necessari" || value === "tutti" ? value : null;
}

function saveChoice(choice: Choice) {
  try {
    document.cookie = `${COOKIE}=${choice}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax`;
  } catch {
    // cookie bloccati: la scelta vale solo finché la pagina resta aperta
  }
}

const copy = publicCopy.cookie;

/** Banner cookie (E8) e preferenze (E9). Il link nel piè di pagina li riapre. */
export function CookieConsent() {
  const choice = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [view, setView] = useState<"auto" | "simple" | "choose" | "closed">("auto");
  const [stats, setStats] = useState(false);
  const mode = view === "choose" ? "choose" : view === "simple" || (view === "auto" && choice === "unset") ? "simple" : "closed";

  const open = (next: "simple" | "choose") => {
    setStats(choice === "tutti");
    setView(next);
  };

  const decide = (picked: Choice) => {
    saveChoice(picked);
    listeners.forEach((cb) => cb());
    setView("closed");
  };

  return (
    <>
      <button
        type="button"
        className={styles.footerButton}
        onClick={() => open("simple")}
      >
        {publicCopy.footer.cookies}
      </button>
      {mode !== "closed" ? (
        <div className={styles.cookie} role="dialog" aria-label="Cookie">
          <span className={styles.cookieTitle}>{mode === "simple" ? copy.title : copy.chooseTitle}</span>
          {mode === "simple" ? (
            <p className={styles.cookieText}>{copy.text}</p>
          ) : (
            <div className={styles.cookieGroup}>
              <div className={styles.cookieRow}>
                <span className={styles.cookieRowText}>
                  <strong className={styles.cookieRowTitle}>{copy.necessary}</strong>
                  <span className={styles.cookieRowSub}>{copy.necessaryText}</span>
                </span>
                <span className={styles.cookieAlways}>{copy.always}</span>
              </div>
              <button type="button" role="switch" aria-checked={stats} className={styles.cookieRow} onClick={() => setStats((v) => !v)}>
                <span className={styles.cookieRowText}>
                  <strong className={styles.cookieRowTitle}>{copy.stats}</strong>
                  <span className={styles.cookieRowSub}>{copy.statsText}</span>
                </span>
                <span className={styles.switch} data-on={stats} aria-hidden="true">
                  <span className={styles.knob} />
                </span>
              </button>
            </div>
          )}
          <div className={styles.cookieButtons}>
            {mode === "simple" ? (
              <>
                <button type="button" className={styles.cookieButton} onClick={() => decide("necessari")}>
                  {copy.reject}
                </button>
                <button type="button" className={styles.cookieButton} onClick={() => decide("tutti")}>
                  {copy.accept}
                </button>
              </>
            ) : (
              <>
                <button type="button" className={`${styles.cookieButton} ${styles.cookieButtonMain}`} onClick={() => decide(stats ? "tutti" : "necessari")}>
                  {copy.save}
                </button>
                <button type="button" className={styles.cookieButton} onClick={() => decide("tutti")}>
                  {copy.acceptAll}
                </button>
              </>
            )}
          </div>
          {mode === "simple" ? (
            <button type="button" className={styles.cookieLink} onClick={() => open("choose")}>
              {copy.choose}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
