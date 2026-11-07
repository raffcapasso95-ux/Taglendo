"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button, Sheet } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { useIsDesktop } from "@/components/ui/ResponsiveDialog";
import { useDialog } from "@/components/ui/useDialog";
import { dayLabelShort } from "@/lib/dates/calendar";
import { agendaHref } from "./href";
import { MonthCalendar } from "./MonthCalendar";
import styles from "./Agenda.module.css";
import cal from "./Calendar.module.css";

type Props = { selected: string; today: string; operator: string | null };

/** Il pulsante «Calendario» accanto ai giorni: su desktop apre un pannello sotto di sé, su telefono un foglio dal basso. */
export function AgendaCalendar({ selected, today, operator }: Props) {
  const router = useRouter();
  const desktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(selected);
  // al riaprirsi riparte dal giorno che si sta guardando
  const [mounted, setMounted] = useState(0);

  const show = () => {
    setPicked(selected);
    setMounted((n) => n + 1);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const go = () => {
    setOpen(false);
    router.push(agendaHref(picked, today, operator));
  };

  const body = <MonthCalendar key={mounted} mode="agenda" selected={picked} today={today} onSelect={setPicked} />;
  const footer = (size: "medium" | "large") => (
    <>
      <Button variant="secondary" size={size} onClick={close}>
        Chiudi
      </Button>
      <Button size={size} onClick={go}>
        Apri {dayLabelShort(picked)}
      </Button>
    </>
  );

  return (
    <>
      <button
        type="button"
        className={cx(styles.calButton, open && styles.calButtonOn)}
        aria-label="Apri il calendario"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={show}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
        </svg>
        <span className={styles.calButtonText}>Calendario</span>
      </button>
      {desktop ? (
        <Popover open={open} onClose={close}>
          {body}
          <div className={cal.popFoot}>{footer("medium")}</div>
        </Popover>
      ) : (
        <Sheet open={open} onClose={close} title="Vai a un giorno" className={cal.sheet} footer={footer("large")}>
          {body}
        </Sheet>
      )}
    </>
  );
}

/** Pannello del desktop: una finestra vera (tastiera e Esc), ma senza velo scuro. */
function Popover({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const { ref } = useDialog(open, onClose, 0);
  const titleId = useId();
  return (
    <dialog ref={ref} className={cal.popover} aria-labelledby={titleId}>
      <h2 id={titleId} className={cal.popTitle}>
        Vai a un giorno
      </h2>
      {children}
    </dialog>
  );
}
