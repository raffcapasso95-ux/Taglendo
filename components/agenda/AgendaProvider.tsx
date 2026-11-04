"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ToastProvider, useToast } from "@/components/ui";
import { agendaCopy } from "@/lib/copy/agenda";
import type { Created } from "@/lib/agenda/actions";
import type { ClientOption, ServiceOption } from "@/lib/agenda/load";
import { addDays } from "@/lib/dates/rome";
import { offlineCopy } from "@/lib/copy/offline";
import { browserStore } from "@/lib/offline/hooks";
import { addItem, addStatus, SAVED_KEY, type QueuedCreate } from "@/lib/offline/queue";
import { toOfflineDay, type OfflineDay } from "@/lib/offline/slots";
import { clock, type DayModel, type Operator } from "@/lib/rules/agenda";
import { AppointmentDetail } from "./AppointmentDetail";
import { dayLabel, NewAppointment, type Prefill } from "./NewAppointment";

type Api = {
  canEdit: boolean;
  /** La fotografia del giorno per lavorare senza rete. */
  offlineDay: OfflineDay;
  day: DayModel;
  /** Mette in coda un nuovo appuntamento fatto offline. */
  queueCreate: (input: QueuedCreate["input"], label: QueuedCreate["label"]) => void;
  /** Mette in coda un cambio di stato fatto offline. */
  queueStatus: (appointmentId: string, status: "confermato" | "completato" | "non_presentato", label: QueuedCreate["label"]) => void;
  openNew: (prefill?: Prefill) => void;
  openWalkIn: () => void;
  openAppointment: (id: string) => void;
};

const AgendaContext = createContext<Api | null>(null);

export function useAgenda(): Api {
  const api = useContext(AgendaContext);
  if (!api) throw new Error("useAgenda va usato dentro <AgendaProvider>");
  return api;
}

type Props = {
  canEdit: boolean;
  salonName: string;
  today: string;
  selectedDate: string;
  operators: Operator[];
  services: ServiceOption[];
  clients: ClientOption[];
  day: DayModel;
  savedAt: string;
  /** Foglio “nuovo appuntamento” da aprire subito (arriva dalla scheda cliente). */
  initialNew?: Prefill | null;
  children: ReactNode;
};

type Dialog = { kind: "new"; prefill?: Prefill } | { kind: "walkin" } | { kind: "appointment"; id: string };

/** Tiene aperti i fogli dell'agenda (nuovo, in negozio, dettaglio) e gli avvisi che seguono. */
export function AgendaProvider(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

function Inner({ canEdit, salonName, today, selectedDate, operators, services, clients, day, savedAt, initialNew, children }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog | null>(() => (canEdit && initialNew ? { kind: "new", prefill: initialNew } : null));

  // L'indirizzo con ?nuovo=… serve una volta sola: lo ripuliamo.
  useEffect(() => {
    if (initialNew) router.replace("/agenda");
  }, [initialNew, router]);

  const offlineDay = useMemo(() => toOfflineDay(day.date, day.hours, day.columns), [day]);

  // Ricorda quando questa agenda è stata disegnata: la barra offline dice "salvata alle…".
  useEffect(() => {
    browserStore.setItem(SAVED_KEY, JSON.stringify({ at: savedAt }));
  }, [savedAt]);

  const api = useMemo<Api>(
    () => ({
      canEdit,
      offlineDay,
      day,
      queueCreate: (input, label) => {
        addItem(browserStore, { kind: "create", input, label });
      },
      queueStatus: (appointmentId, status, label) => {
        addStatus(browserStore, { kind: "status", appointmentId, status, label });
      },
      openNew: (prefill) => setDialog({ kind: "new", prefill }),
      openWalkIn: () => setDialog({ kind: "walkin" }),
      openAppointment: (id) => setDialog({ kind: "appointment", id }),
    }),
    [canEdit, offlineDay, day],
  );

  const close = useCallback(() => setDialog(null), []);

  // Dopo una modifica: chiude il foglio, mostra l'avviso e, se il giorno è un altro, ci va.
  const done = useCallback(
    (message: string, sub?: string, date?: string) => {
      setDialog(null);
      toast(message, sub);
      if (!navigator.onLine) return; // senza rete non si ricarica la pagina: resta com'è
      if (date && date !== selectedDate) router.push(date === today ? "/agenda" : `/agenda?g=${date}`);
      else router.refresh();
    },
    [router, toast, selectedDate, today],
  );

  const created = (c: Created) =>
    done(agendaCopy.toasts.created, `${dayLabel(c.date, today, addDays(today, 1))} · ${clock(c.startMin)} · ${c.clientName}`, c.date);

  return (
    <AgendaContext.Provider value={api}>
      {children}
      {dialog?.kind === "new" || dialog?.kind === "walkin" ? (
        <NewAppointment
          key={dialog.kind}
          mode={dialog.kind}
          prefill={dialog.kind === "new" ? dialog.prefill : undefined}
          operators={operators}
          services={services}
          clients={clients}
          today={today}
          selectedDate={selectedDate}
          onClose={close}
          onCreated={created}
          onQueued={() => {
            setDialog(null);
            toast(offlineCopy.queued, offlineCopy.queuedSub);
          }}
        />
      ) : null}
      {dialog?.kind === "appointment" ? (
        <AppointmentDetail
          key={dialog.id}
          id={dialog.id}
          today={today}
          canEdit={canEdit}
          salonName={salonName}
          multipleOperators={operators.length > 1}
          onClose={close}
          onChanged={(t, date) => done(t.message, t.sub, date)}
        />
      ) : null}
    </AgendaContext.Provider>
  );
}
