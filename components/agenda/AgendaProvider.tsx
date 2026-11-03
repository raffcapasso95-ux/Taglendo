"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ToastProvider, useToast } from "@/components/ui";
import { agendaCopy } from "@/lib/copy/agenda";
import type { Created } from "@/lib/agenda/actions";
import type { ClientOption, ServiceOption } from "@/lib/agenda/load";
import { addDays } from "@/lib/dates/rome";
import { clock, type Operator } from "@/lib/rules/agenda";
import { AppointmentDetail } from "./AppointmentDetail";
import { dayLabel, NewAppointment, type Prefill } from "./NewAppointment";

type Api = {
  canEdit: boolean;
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

function Inner({ canEdit, salonName, today, selectedDate, operators, services, clients, children }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const api = useMemo<Api>(
    () => ({
      canEdit,
      openNew: (prefill) => setDialog({ kind: "new", prefill }),
      openWalkIn: () => setDialog({ kind: "walkin" }),
      openAppointment: (id) => setDialog({ kind: "appointment", id }),
    }),
    [canEdit],
  );

  const close = useCallback(() => setDialog(null), []);

  // Dopo una modifica: chiude il foglio, mostra l'avviso e, se il giorno è un altro, ci va.
  const done = useCallback(
    (message: string, sub?: string, date?: string) => {
      setDialog(null);
      toast(message, sub);
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
