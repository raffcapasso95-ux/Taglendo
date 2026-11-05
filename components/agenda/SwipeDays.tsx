"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode, type TouchEvent } from "react";
import { addDays } from "@/lib/dates/rome";
import { swipeTarget } from "@/lib/rules/swipe";
import styles from "./Agenda.module.css";

const hrefFor = (date: string, today: string, operator: string | null) => {
  const q = new URLSearchParams();
  if (date !== today) q.set("g", date);
  if (operator) q.set("op", operator);
  const s = q.toString();
  return s ? `/agenda?${s}` : "/agenda";
};

/** Sul telefono si cambia giorno scorrendo l'agenda a destra o a sinistra, come in un calendario. */
export function SwipeDays({ date, today, operator, children }: { date: string; today: string; operator: string | null; children: ReactNode }) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  const onStart = (e: TouchEvent) => {
    const t = e.touches[0];
    start.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY, t: e.timeStamp } : null;
  };
  const onEnd = (e: TouchEvent) => {
    const from = start.current;
    const t = e.changedTouches[0];
    start.current = null;
    if (!from || !t) return;
    const step = swipeTarget(t.clientX - from.x, t.clientY - from.y, e.timeStamp - from.t);
    if (step !== 0) router.push(hrefFor(addDays(date, step), today, operator), { scroll: false });
  };

  return (
    <div className={styles.swipe} onTouchStart={onStart} onTouchEnd={onEnd}>
      {children}
    </div>
  );
}
