import "server-only";
import { buildStaffEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/send";
import { staffCopy } from "@/lib/copy/emails";
import { dayRange, romeDate, romeMinutes } from "@/lib/dates/rome";
import { receives, summaryLines, newBookingLine, cancelledLine } from "@/lib/rules/staffText";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/supabase/env";
import { footerOf, loadApptContext } from "./context";
import { pushDevices, sendPush, type PushMessage } from "./push";

type Recipient = {
  memberId: string;
  userId: string;
  role: "owner" | "barber";
  prefs: { new_booking: boolean; client_cancel: boolean; daily_summary: boolean; channel: "push" | "email" | "both"; only_mine: boolean };
};

async function recipients(salonId: string): Promise<Recipient[]> {
  const admin = createAdminClient();
  const { data: members } = await admin.from("members").select("id, user_id, role").eq("salon_id", salonId).eq("active", true).not("user_id", "is", null);
  const ids = (members ?? []).map((m) => m.id);
  const { data: prefs } = ids.length ? await admin.from("notification_prefs").select("*").in("member_id", ids) : { data: [] };
  const byId = new Map((prefs ?? []).map((p) => [p.member_id, p]));
  return (members ?? []).map((m) => {
    const p = byId.get(m.id);
    return {
      memberId: m.id,
      userId: m.user_id!,
      role: m.role,
      prefs: {
        new_booking: p?.new_booking ?? true,
        client_cancel: p?.client_cancel ?? true,
        daily_summary: p?.daily_summary ?? false,
        channel: (p?.channel ?? "push") as "push" | "email" | "both",
        only_mine: p?.only_mine ?? false,
      },
    };
  });
}

async function emailOf(userId: string): Promise<string | null> {
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/**
 * Manda l'avviso sul canale scelto. Con "notifica" ma nessun dispositivo attivato ripiega sull'email,
 * così l'avviso non si perde.
 */
async function deliver(r: Recipient, push: PushMessage, mail: { subject: string; title: string; lines: string[]; salonName: string; footer: string }) {
  const wantsPush = r.prefs.channel === "push" || r.prefs.channel === "both";
  let wantsEmail = r.prefs.channel === "email" || r.prefs.channel === "both";
  if (wantsPush) {
    const sent = (await pushDevices(r.memberId)) > 0 ? await sendPush(r.memberId, push) : 0;
    if (sent === 0 && r.prefs.channel === "push") wantsEmail = true;
  }
  if (!wantsEmail) return;
  const to = await emailOf(r.userId);
  if (!to) return;
  const built = await buildStaffEmail({
    subject: mail.subject,
    salonName: mail.salonName,
    title: mail.title,
    lines: mail.lines,
    ctaLabel: staffCopy.open,
    ctaUrl: `${env.siteUrl()}${push.url}`,
    footer: mail.footer,
  });
  const sent = await sendEmail({ to, subject: built.subject, html: built.html, text: built.text, fromName: mail.salonName });
  if (!sent.ok) console.error("invio avviso non riuscito:", sent.error);
}

/** Nuova prenotazione online o annullamento del cliente: avvisa chi deve. Non fa mai fallire chi l'ha chiamata. */
export async function notifyStaff(kind: "new" | "cancel", appointmentId: string): Promise<void> {
  try {
    const c = await loadApptContext(appointmentId);
    if (!c) return;
    const today = romeDate(new Date());
    const client = c.clientName ?? "Cliente";
    const body =
      kind === "new"
        ? newBookingLine({ client, date: c.date, today, startMin: c.startMin, service: c.serviceName, barber: c.multiple ? c.memberName : null })
        : cancelledLine({ client, date: c.date, today, startMin: c.startMin, free: staffCopy.cancelled.free });
    const title = kind === "new" ? staffCopy.newBooking.push : staffCopy.cancelled.push;
    const subject = `${title}: ${body}`;
    for (const r of await recipients(c.salon.id)) {
      if (kind === "new" ? !r.prefs.new_booking : !r.prefs.client_cancel) continue;
      if (!receives({ role: r.role, onlyMine: r.prefs.only_mine, isMine: r.memberId === c.memberId })) continue;
      await deliver(r, { title, body, url: "/agenda" }, { subject, title, lines: [body], salonName: c.salon.name, footer: footerOf(c.salon) });
    }
  } catch (e) {
    console.error("avvisi allo staff non riusciti:", e);
  }
}

/** Il riepilogo delle 8:00: una volta al giorno per operatore, solo se c'è almeno un appuntamento. */
export async function runSummaries(now: Date): Promise<number> {
  const admin = createAdminClient();
  const today = romeDate(now);
  const { start, end } = dayRange(today);
  const { data: salons } = await admin.from("salons").select("id, name, address, phone").is("deleted_at", null);
  let sent = 0;
  for (const salon of salons ?? []) {
    for (const r of await recipients(salon.id)) {
      if (!r.prefs.daily_summary) continue;
      const { data: appts } = await admin
        .from("appointments")
        .select("member_id, starts_at, service_name, client:clients(name)")
        .eq("salon_id", salon.id)
        .eq("status", "confermato")
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString());
      const mine = (appts ?? []).filter((a) => receives({ role: r.role, onlyMine: r.prefs.only_mine, isMine: a.member_id === r.memberId }));
      if (mine.length === 0) continue;
      // una volta sola al giorno: il primo che scrive la riga vince
      const { error } = await admin.from("summary_runs").insert({ member_id: r.memberId, run_date: today });
      if (error) continue;
      const lines = summaryLines(mine.map((a) => ({ startMin: romeMinutes(new Date(a.starts_at)), client: a.client?.name ?? "Cliente", service: a.service_name })));
      const title = staffCopy.summary.push;
      const subject = staffCopy.summary.subject(mine.length);
      await deliver(r, { title: subject, body: lines.slice(0, 3).join(" · "), url: "/agenda" }, { subject, title: subject, lines, salonName: salon.name, footer: footerOf({ name: salon.name, address: salon.address, phone: salon.phone ?? "" }) });
      void title;
      sent += 1;
    }
  }
  return sent;
}
