"use client";

import { Button } from "@/components/ui";
import { agendaCopy } from "@/lib/copy/agenda";
import { useAgenda } from "./AgendaProvider";
import styles from "./Dialogs.module.css";

const copy = agendaCopy.actions;

/** Su desktop: i due pulsanti in alto a destra. Senza il permesso di fissare non compaiono. */
export function HeaderActions() {
  const { canEdit, openNew, openWalkIn } = useAgenda();
  if (!canEdit) return null;
  return (
    <div className={styles.headerActions}>
      <Button variant="secondary" onClick={openWalkIn}>
        {copy.walkIn}
      </Button>
      <Button onClick={() => openNew()}>{copy.add}</Button>
    </div>
  );
}

/** Su telefono: i due pulsanti fissi sopra la barra in basso. */
export function PhoneActions() {
  const { canEdit, openNew, openWalkIn } = useAgenda();
  if (!canEdit) return null;
  return (
    <div className={styles.phoneActions}>
      <Button variant="secondary" size="large" onClick={openWalkIn}>
        {copy.walkInPhone}
      </Button>
      <Button size="large" onClick={() => openNew()}>
        {copy.addPhone}
      </Button>
    </div>
  );
}
