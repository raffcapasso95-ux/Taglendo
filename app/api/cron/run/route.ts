import { timingSafeEqual } from "node:crypto";
import { romeDate } from "@/lib/dates/rome";
import { runReminders } from "@/lib/notify/reminders";
import { vapidStatus } from "@/lib/notify/push";
import { runSummaries } from "@/lib/notify/staff";
import { dueJobs } from "@/lib/rules/staffText";

export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const romeHour = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23" }).format(d));

/**
 * Lo chiama ogni ora il database (pg_cron). Alle 8 di Roma partono i riepiloghi, alle 18 i promemoria;
 * se un passaggio salta, quelli dopo recuperano e i segni evitano i doppioni.
 */
async function handle(request: Request) {
  if (!authorized(request)) return new Response("Non autorizzato", { status: 401 });
  const now = new Date();
  // ?job=reminders|summaries lancia un lavoro a mano, a qualunque ora (serve comunque il segreto)
  const forced = new URL(request.url).searchParams.get("job");
  const jobs = forced ? { summaries: forced === "summaries", reminders: forced === "reminders" } : dueJobs(romeHour(now));
  const result = { date: romeDate(now), summaries: 0, reminders: 0, push: vapidStatus() };
  if (jobs.summaries) result.summaries = await runSummaries(now);
  if (jobs.reminders) result.reminders = await runReminders(now);
  return Response.json(result);
}

export const GET = handle;
export const POST = handle;
