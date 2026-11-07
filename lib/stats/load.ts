import "server-only";
import { redirect } from "next/navigation";
import { requireSalon } from "@/lib/auth/session";
import { hoursFor, operatorsOf } from "@/lib/agenda/day";
import { signedPhotoUrls } from "@/lib/clients/photoUrls";
import { formatPrice, formatTime } from "@/lib/dates/format";
import { addDays, dayRange, isValidDate, romeDate, romeMinutes, weekdayOf } from "@/lib/dates/rome";
import { loadWeek } from "@/lib/hours/week";
import { formatMinutes } from "@/lib/rules/hours";
import {
  areaPath,
  averageCents,
  bestPoint,
  comparedWith,
  dayAxis,
  delta,
  isPeriod,
  periodEnd,
  periodStart,
  periodTitle,
  plural,
  reportText,
  seriesPoints,
  shiftPeriod,
  share,
  type Delta,
  type Period,
} from "@/lib/rules/stats";
import { operatorColor } from "@/lib/rules/agenda";
import { monthTitle } from "@/lib/dates/calendar";
import { createClient } from "@/lib/supabase/server";

type Summary = {
  revenue: number;
  count: number;
  clients: number;
  discounts: number;
  no_show: number;
  canceled: number;
  new_clients: number;
  by_member: Array<{ member_id: string; revenue: number; count: number }>;
  top: Array<{ client_id: string; name: string; avatar_color: number | null; photo_path: string | null; visits: number; revenue: number }>;
  series: Array<{ bucket: string; revenue: number }>;
};

type DayRow = {
  id: string;
  time: string;
  clientName: string;
  avatarColor: number | null;
  photoUrl: string | null;
  sub: string;
  priceCents: number;
  listPriceCents: number | null;
  status: "confermato" | "completato" | "annullato" | "non_presentato";
};

export type StatsModel = {
  period: Period;
  title: string;
  prevHref: string;
  nextHref: string | null;
  heroLabel: string;
  revenue: string;
  delta: Delta | null;
  stats: Array<{ label: string; value: string }>;
  chart: null | { fill: string; line: string; label: string; from: string; to: string; note: { label: string; strong: string; value: string } | null };
  note: string | null;
  operators: Array<{ id: string; name: string; color: number; value: string; sub: string; fill: number }> | null;
  top: Array<{ id: string; name: string; color: number | null; photoUrl: string | null; sub: string; value: string }>;
  day: null | { rows: DayRow[]; total: string; whatsapp: string };
};

const href = (period: Period, start: string) => `/statistiche?periodo=${period}&data=${start}`;

const rangeIso = (from: string, to: string) => ({ p_from: dayRange(from).start.toISOString(), p_to: dayRange(addDays(to, -1)).end.toISOString() });

export async function loadStats(params: { periodo?: string; data?: string }): Promise<StatsModel> {
  const { salon, role } = await requireSalon();
  if (role !== "owner") redirect("/agenda");
  const supabase = await createClient();
  const now = new Date();
  const today = romeDate(now);
  const period: Period = isPeriod(params.periodo) ? params.periodo : "mese";
  const anchor = isValidDate(params.data) ? params.data : today;
  const start = periodStart(period, anchor > today ? today : anchor);
  const end = periodEnd(period, start);
  const prevStart = shiftPeriod(period, start, -1);
  const nextStart = shiftPeriod(period, start, 1);

  const call = async (from: string, to: string, bucket: "day" | "month") => {
    const { data } = await supabase.rpc("stats_summary", { p_salon: salon.id, ...rangeIso(from, to), p_bucket: bucket });
    return data as unknown as Summary;
  };

  const bucket = period === "anno" ? "month" : "day";
  const operatorsPromise = operatorsOf(supabase, salon.id);
  // un periodo ancora in corso (il mese a metà) si confronta con lo stesso tratto del periodo prima, non con tutto il periodo prima
  const inProgress = end > addDays(today, 1);
  let prevEnd = start;
  if (inProgress && period !== "giorno") {
    let elapsed = 0;
    for (let d = start; d <= today; d = addDays(d, 1)) elapsed++;
    const sameSpan = addDays(prevStart, elapsed);
    prevEnd = sameSpan < start ? sameSpan : start;
  }
  const [cur, prev, operators] = await Promise.all([call(start, end, bucket), period === "giorno" ? Promise.resolve(null) : call(prevStart, prevEnd, "day"), operatorsPromise]);

  // il giorno si confronta con la media dei suoi simili (stesso giorno della settimana, ultime 8 settimane, giorni con incassi)
  let before = prev?.revenue ?? 0;
  if (period === "giorno") {
    const history = await call(addDays(start, -56), start, "day");
    const same = history.series.filter((s) => weekdayOf(s.bucket) === weekdayOf(start) && s.revenue > 0);
    before = same.length ? Math.round(same.reduce((sum, s) => sum + s.revenue, 0) / same.length) : 0;
  }

  const heroLabel = period === "giorno" ? "Incasso del giorno" : "Incasso";
  const stats =
    period === "giorno"
      ? [
          { label: "Clienti", value: String(cur.count) },
          { label: "Scontrino medio", value: formatPrice(averageCents(cur.revenue, cur.count)) },
          { label: "Sconti fatti", value: cur.discounts > 0 ? `−${formatPrice(cur.discounts)}` : formatPrice(0) },
        ]
      : [
          { label: "Appuntamenti", value: String(cur.count) },
          { label: "Scontrino medio", value: formatPrice(averageCents(cur.revenue, cur.count)) },
          { label: "Clienti nuovi", value: String(cur.new_clients) },
        ];

  // andamento
  let chart: StatsModel["chart"] = null;
  if (period !== "giorno") {
    const week = await loadWeek(supabase, salon.id);
    const open = Array.from({ length: 7 }, (_, d) => !week[d]!.closed && week[d]!.ranges.length > 0);
    const revenueByKey = new Map(cur.series.map((s) => [s.bucket, s.revenue]));
    const points = seriesPoints(period, start, today, open, (k) => revenueByKey.get(k) ?? 0);
    if (points.length > 0) {
      const values = points.map((p) => p.revenue);
      const { line, fill } = areaPath(values);
      const best = bestPoint(points);
      const isYear = period === "anno";
      const name = (k: string) => (isYear ? monthTitle(k) : dayAxis(k));
      const first = points[0]!.key;
      const last = points[points.length - 1]!.key;
      const [min, max] = [Math.min(...values), Math.max(...values)];
      chart = {
        fill,
        line,
        label: `Incassi ${isYear ? "mese per mese" : "giorno per giorno"}: da ${formatPrice(min)} a ${formatPrice(max)}${best ? `, il migliore ${name(best.key)} con ${formatPrice(best.revenue)}` : ""}`,
        from: name(first),
        to: isYear && start.slice(0, 4) === today.slice(0, 4) ? `${name(last)} · fino a oggi` : name(last),
        note: best ? { label: isYear ? "Il mese migliore:" : "Il giorno migliore:", strong: name(best.key), value: formatPrice(best.revenue) } : null,
      };
    }
  }

  // per operatore
  const colorOf = new Map(operators.map((o, i) => [o.id, operatorColor(o, i)]));
  const byId = new Map(cur.by_member.map((m) => [m.member_id, m]));
  const maxRev = Math.max(0, ...cur.by_member.map((m) => m.revenue));
  const operatorRows =
    operators.length > 1
      ? operators
          .map((o) => {
            const m = byId.get(o.id);
            const unit = period === "giorno" ? plural(m?.count ?? 0, "cliente", "clienti") : plural(m?.count ?? 0, "appuntamento", "appuntamenti");
            return { id: o.id, name: o.name, color: colorOf.get(o.id) ?? 0, revenue: m?.revenue ?? 0, value: formatPrice(m?.revenue ?? 0), sub: unit, fill: share(m?.revenue ?? 0, maxRev) };
          })
          .sort((a, b) => b.revenue - a.revenue)
          .map((o) => ({ id: o.id, name: o.name, color: o.color, value: o.value, sub: o.sub, fill: o.fill }))
      : null;

  // top clienti
  const photos = await signedPhotoUrls(supabase, cur.top.map((t) => t.photo_path));
  const top = cur.top.map((t) => ({
    id: t.client_id,
    name: t.name,
    color: t.avatar_color,
    photoUrl: t.photo_path ? (photos.get(t.photo_path) ?? null) : null,
    sub: plural(t.visits, "visita", "visite"),
    value: formatPrice(t.revenue),
  }));

  // giorno: nota e appuntamenti
  let note: string | null = null;
  let day: StatsModel["day"] = null;
  if (period === "giorno") {
    const hours = await hoursFor(supabase, salon.id, start);
    const nowMin = romeMinutes(now);
    let first: string;
    if (hours.closed) first = "Giorno di chiusura";
    else if (start < today || (start === today && nowMin >= hours.closeMin!)) first = `Giornata chiusa alle ${formatMinutes(hours.closeMin!)}`;
    else if (start === today) first = `Giornata in corso · chiude alle ${formatMinutes(hours.closeMin!)}`;
    else first = `Giornata in programma · chiude alle ${formatMinutes(hours.closeMin!)}`;
    const extra: string[] = [];
    if (cur.no_show > 0) extra.push(plural(cur.no_show, "non presentato", "non presentati"));
    if (cur.canceled > 0) extra.push(plural(cur.canceled, "annullato", "annullati"));
    const noteExtra = extra.length ? ` · ${extra.join(" e ")} ${cur.no_show + cur.canceled === 1 ? "non entra" : "non entrano"} nell’incasso` : "";
    note = `${first}${noteExtra}`;

    const { start: from, end: to } = dayRange(start);
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, starts_at, service_name, price_cents, list_price_cents, price_note, status, member_id, client:clients(name, avatar_color, photo_path)")
      .eq("salon_id", salon.id)
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at");
    const rowsRaw = appts ?? [];
    const dayPhotos = await signedPhotoUrls(supabase, rowsRaw.map((a) => a.client?.photo_path));
    const memberName = new Map(operators.map((o) => [o.id, o.name]));
    const rows: DayRow[] = rowsRaw.map((a) => ({
      id: a.id,
      time: formatTime(new Date(a.starts_at)),
      clientName: a.client?.name ?? "Cliente",
      avatarColor: a.client?.avatar_color ?? null,
      photoUrl: a.client?.photo_path ? (dayPhotos.get(a.client.photo_path) ?? null) : null,
      sub: [a.service_name, memberName.get(a.member_id), a.price_note].filter(Boolean).join(" · "),
      priceCents: a.price_cents,
      listPriceCents: a.list_price_cents,
      status: a.status,
    }));
    const title = periodTitle("giorno", start);
    day = {
      rows,
      total: formatPrice(cur.revenue),
      whatsapp: `https://wa.me/?text=${encodeURIComponent(
        reportText({
          title,
          salon: salon.name,
          revenue: cur.revenue,
          count: cur.count,
          discounts: cur.discounts,
          operators: (operatorRows ?? []).map((o) => ({ name: o.name, revenue: byId.get(o.id)?.revenue ?? 0, count: byId.get(o.id)?.count ?? 0 })),
        }),
      )}`,
    };
  }

  return {
    period,
    title: periodTitle(period, start),
    prevHref: href(period, prevStart),
    nextHref: nextStart <= today ? href(period, nextStart) : null,
    heroLabel,
    revenue: formatPrice(cur.revenue),
    delta: delta(cur.revenue, before, comparedWith(period, start) + (inProgress && period !== "giorno" ? " (stessi giorni)" : "")),
    stats,
    chart,
    note,
    operators: operatorRows,
    top,
    day,
  };
}
