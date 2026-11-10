import type { Metadata } from "next";
import { AgendaSkeleton } from "@/components/states/Skeletons";
import { Suspense } from "react";
import { AgendaProvider } from "@/components/agenda/AgendaProvider";
import { AutoRefresh } from "@/components/agenda/AutoRefresh";
import { AgendaTour } from "@/components/tour/AgendaTour";
import { DayHeader } from "@/components/agenda/DayHeader";
import { DayView } from "@/components/agenda/DayView";
import { PhoneActions } from "@/components/agenda/HeaderActions";
import { OperatorFilter } from "@/components/agenda/OperatorFilter";
import { SidePanel } from "@/components/agenda/SidePanel";
import styles from "@/components/agenda/Agenda.module.css";
import { PendingAppointments } from "@/components/offline/PendingAppointments";
import { SwipeDays } from "@/components/agenda/SwipeDays";
import { WeekBar } from "@/components/agenda/WeekBar";
import { loadAgenda } from "@/lib/agenda/load";
import { weekdayName } from "@/lib/dates/rome";
import { clock } from "@/lib/rules/agenda";

export const metadata: Metadata = { title: "Agenda · Taglendo" };

async function Content({ searchParams }: { searchParams: Promise<{ g?: string; op?: string; nuovo?: string; servizio?: string; barbiere?: string; nome?: string; guida?: string }> }) {
  const { g, op, nuovo, servizio, barbiere, nome, guida } = await searchParams;
  const data = await loadAgenda({ date: g, op });
  if (!data) return null;
  const { day } = data;

  return (
    <AgendaProvider
      canEdit={data.canEdit}
      salonName={data.salonName}
      today={data.today}
      selectedDate={day.date}
      operators={data.operators}
      services={data.services}
      clients={data.clients}
      closedDates={data.strip.filter((d) => d.closed).map((d) => d.date)}
      day={data.day}
      savedAt={data.savedAt}
      initialNew={
        nuovo
          ? {
              clientId: nuovo === "nuovo" ? null : nuovo,
              newName: nuovo === "nuovo" ? (nome?.slice(0, 60) ?? "") : null,
              serviceId: servizio ?? null,
              memberId: barbiere ?? null,
            }
          : null
      }
    >
    <div className={styles.page}>
      <div className={styles.main}>
        <DayHeader
          salonName={data.salonName}
          salonLogo={data.salonLogo}
          userInitials={data.userInitials}
          greeting={data.greeting}
          longDate={data.longDate}
          summary={day.summary}
          showToday={!day.isToday}
        />
        <div className={styles.controls}>
          <WeekBar week={data.week} selected={day.date} today={data.today} operator={data.selectedOperator}>
            <OperatorFilter operators={data.operators} selected={data.selectedOperator} date={day.date} today={data.today} />
          </WeekBar>
        </div>
        <PendingAppointments date={day.date} />
        <SwipeDays date={day.date} today={data.today} operator={data.selectedOperator}>
          <DayView day={day} weekdayName={weekdayName(day.date)} multiple={day.columns.length > 1} />
        </SwipeDays>
      </div>
      <SidePanel day={day} title={day.isToday ? `Adesso in salone · ${clock(day.nowMin)}` : "Primo cliente"} />
      <PhoneActions />
      <AutoRefresh />
      {(!data.tourSeen && !nuovo) || guida ? <AgendaTour firstName={data.userFirstName} show /> : null}
    </div>
    </AgendaProvider>
  );
}

export default function Page(props: PageProps<"/agenda">) {
  return (
    <Suspense fallback={<AgendaSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
