"use client";

import { useId, type ReactNode } from "react";
import { cx } from "./cx";
import { useDialog } from "./useDialog";
import styles from "./Modal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pulsanti in fondo, allineati a destra. */
  footer?: ReactNode;
};

const CLOSE_MS = 200; // --duration-toast-in: stessa uscita breve

/** Finestra centrata per il desktop (B6-D, B7-D). */
export function Modal({ open, onClose, title, children, footer }: Props) {
  const { ref, visible } = useDialog(open, onClose, CLOSE_MS);
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx(styles.modal, visible && styles.open)}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </dialog>
  );
}
