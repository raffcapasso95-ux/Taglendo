import type { Metadata } from "next";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/agenda/AutoRefresh";
import { DayHeader } from "@/components/agenda/DayHeader";
import { DayStrip } from "@/components/agenda/DayStrip";
import { DayView } from "@/components/agenda/DayView";
import { OperatorFilter } from "@/components/agenda/OperatorFilter";
import { SidePanel } from "@/components/agenda/SidePanel";
import styles from "@/components/agenda/Agenda.module.css";
import { loadAgenda } from "@/lib/agenda/load";
import { weekdayName } from "@/lib/dates/rome";
import { clock } from "@/lib/rules/agenda";

export const metadata: Metadata = { title: "Agenda · Taglendo" };

async function Content({ searchParams }: { searchParams: Promise<{ g?: string; op?: string }> }) {
  const { g, op } = await searchParams;
  const data = await loadAgenda({ date: g, op });
  if (!data) return null;
  const { day } = data;

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <DayHeader
          salonName={data.salonName}
          userInitials={data.userInitials}
          greeting={data.greeting}
          longDate={data.longDate}
          summary={day.summary}
          showToday={!day.isToday}
        />
        <div className={styles.controls}>
          <DayStrip days={data.strip} selected={day.date} today={data.today} operator={data.selectedOperator} />
          <OperatorFilter operators={data.operators} selected={data.selectedOperator} date={day.date} today={data.today} />
        </div>
        <DayView day={day} weekdayName={weekdayName(day.date)} multiple={day.columns.length > 1} />
      </div>
      <SidePanel day={day} title={day.isToday ? `Adesso in salone · ${clock(day.nowMin)}` : "Primo cliente"} />
      <AutoRefresh />
    </div>
  );
}

export default function Page(props: PageProps<"/agenda">) {
  return (
    <Suspense fallback={null}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
