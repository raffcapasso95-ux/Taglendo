"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Modal } from "./Modal";
import { Sheet } from "./Sheet";

const QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Vero su desktop (da 1024 px). Sul server e al primo disegno è falso: si parte dal telefono. */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Classe in più per il riquadro quando è un foglio (telefono). */
  sheetClassName?: string;
};

/** Foglio dal basso sul telefono, finestra centrata su desktop. */
export function ResponsiveDialog({ sheetClassName, ...props }: Props) {
  const desktop = useIsDesktop();
  return desktop ? <Modal {...props} /> : <Sheet {...props} className={sheetClassName} />;
}
