"use client";

import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Gestisce un <dialog> modale con animazione di entrata e uscita.
 * Il <dialog> nativo blocca il focus al suo interno, rende inerte il resto
 * della pagina e restituisce il focus a chi l'ha aperto.
 */
export function useDialog(open: boolean, onClose: () => void, closeMs: number) {
  const ref = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Chi ha aperto la finestra riavrà il focus anche se la finestra viene tolta dalla pagina
  // prima della sua chiusura nativa (il browser allora non lo restituisce).
  // Si legge al primo disegno: dopo, il campo con autofocus avrebbe già preso il focus.
  const [opener] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null,
  );
  useEffect(() => {
    return () => {
      if (opener?.isConnected && (document.activeElement === document.body || !document.activeElement?.isConnected)) opener.focus();
    };
  }, [opener]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      // un frame di ritardo perché la transizione parta dallo stato chiuso
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    const frame = requestAnimationFrame(() => setVisible(false));
    const timer = window.setTimeout(
      () => {
        if (dialog.open) dialog.close();
      },
      prefersReducedMotion() ? 0 : closeMs,
    );
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [open, closeMs]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Esc: chiudiamo noi, così l'animazione di uscita resta uguale
    const onCancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current();
    };
    // clic sul fondo scuro (fuori dal riquadro del dialog)
    const onClick = (e: MouseEvent) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) onCloseRef.current();
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("click", onClick);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onClick);
    };
  }, []);

  return { ref, visible };
}
