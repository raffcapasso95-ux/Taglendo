"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "./cx";
import styles from "./Toast.module.css";

type ToastMessage = { message: string; detail?: string };
type ShowToast = (message: string, detail?: string) => void;

const ToastContext = createContext<ShowToast | null>(null);

/** Quanto resta visibile un avviso (Taglendo App.dc.html: 2,8 s). */
const TOAST_VISIBLE_MS = 2800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback<ShowToast>((message, detail) => {
    window.clearTimeout(timer.current);
    setToast({ message, detail });
    setVisible(true);
    timer.current = window.setTimeout(() => setVisible(false), TOAST_VISIBLE_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toast ? (
          <div className={cx(styles.toast, visible && styles.visible)}>
            <span className={styles.message}>{toast.message}</span>
            {toast.detail ? <span className={styles.detail}>{toast.detail}</span> : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast va usato dentro <ToastProvider>");
  return show;
}
