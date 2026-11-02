"use client";

import { useId, type ReactNode } from "react";
import { cx } from "./cx";
import { useDialog } from "./useDialog";
import styles from "./Sheet.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pulsanti in fondo, sempre visibili. */
  footer?: ReactNode;
};

const CLOSE_MS = 240; // --duration-sheet-close

/** Foglio dal basso per il telefono (Taglendo App.dc.html). */
export function Sheet({ open, onClose, title, children, footer }: Props) {
  const { ref, visible } = useDialog(open, onClose, CLOSE_MS);
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx(styles.sheet, visible && styles.open)}
    >
      <div className={styles.handle} aria-hidden="true">
        <span />
      </div>
      <div className={styles.body}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </dialog>
  );
}
