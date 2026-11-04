"use server";

import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { alertsCopy, emailPrefsCopy } from "@/lib/copy/notify";
import { rulesCopy } from "@/lib/copy/rules";
import { createClient } from "@/lib/supabase/server";

export type Rules = {
  bookingOnline: boolean;
  cancelOnline: boolean;
  showPrices: boolean;
  minNoticeMin: 30 | 120 | 1440;
  maxAdvanceDays: 14 | 30 | 60;
  slotStepMin: 15 | 30;
  cancelLimitMin: 120 | 1440;
};

export type RulesResult = { ok: true } | { ok: false; error: string };

const NOTICE = [30, 120, 1440];
const ADVANCE = [14, 30, 60];
const STEP = [15, 30];
const LIMIT = [120, 1440];

/** Salva le regole di prenotazione. Le cambia il titolare; i valori ammessi li ricontrolla anche il database. */
export async function saveRules(input: Rules): Promise<RulesResult> {
  const { role, salon } = await requireSalon();
  if (role !== "owner") return { ok: false, error: rulesCopy.errors.notOwner };
  if (
    typeof input.bookingOnline !== "boolean" || typeof input.cancelOnline !== "boolean" || typeof input.showPrices !== "boolean" ||
    !NOTICE.includes(input.minNoticeMin) || !ADVANCE.includes(input.maxAdvanceDays) || !STEP.includes(input.slotStepMin) || !LIMIT.includes(input.cancelLimitMin)
  ) {
    return { ok: false, error: rulesCopy.errors.generic };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salons")
    .update({
      booking_online: input.bookingOnline,
      cancel_online: input.cancelOnline,
      show_prices: input.showPrices,
      min_notice_min: input.minNoticeMin,
      max_advance_days: input.maxAdvanceDays,
      slot_step_min: input.slotStepMin,
      cancel_limit_min: input.cancelLimitMin,
    })
    .eq("id", salon.id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: rulesCopy.errors.generic };
  revalidatePath("/impostazioni/regole");
  revalidatePath("/link");
  revalidatePath(`/${salon.slug}`);
  return { ok: true };
}

/* ───────────── Email ai clienti (C6) e avvisi (C11) ───────────── */

export type EmailPrefs = { confirmation: boolean; reminder: boolean; cancellation: boolean };

/** Quali email partono ai clienti. Le cambia il titolare; il codice di conferma non si spegne. */
export async function saveEmailPrefs(input: EmailPrefs): Promise<RulesResult> {
  const { role, salon } = await requireSalon();
  if (role !== "owner") return { ok: false, error: emailPrefsCopy.errors.notOwner };
  if (typeof input.confirmation !== "boolean" || typeof input.reminder !== "boolean" || typeof input.cancellation !== "boolean") return { ok: false, error: emailPrefsCopy.errors.generic };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_prefs")
    .upsert({ salon_id: salon.id, confirmation: input.confirmation, reminder: input.reminder, cancellation: input.cancellation })
    .select("salon_id");
  if (error || !data?.length) return { ok: false, error: emailPrefsCopy.errors.generic };
  revalidatePath("/impostazioni/email");
  return { ok: true };
}

export type AlertPrefs = { newBooking: boolean; clientCancel: boolean; dailySummary: boolean; channel: "push" | "email" | "both"; onlyMine: boolean };

/** Gli avvisi di chi è collegato: ognuno cambia solo i propri. */
export async function saveAlertPrefs(input: AlertPrefs): Promise<RulesResult> {
  const { id } = await requireSalon();
  if (!["push", "email", "both"].includes(input.channel)) return { ok: false, error: alertsCopy.errors.generic };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_prefs")
    .upsert({ member_id: id, new_booking: !!input.newBooking, client_cancel: !!input.clientCancel, daily_summary: !!input.dailySummary, channel: input.channel, only_mine: !!input.onlyMine })
    .select("member_id");
  if (error || !data?.length) return { ok: false, error: alertsCopy.errors.generic };
  revalidatePath("/impostazioni/avvisi");
  return { ok: true };
}

/** Salva il dispositivo per le notifiche. Un dispositivo appartiene a un solo operatore: se cambia utente, passa al nuovo. */
export async function savePushSubscription(input: { endpoint: string; p256dh: string; auth: string }): Promise<RulesResult> {
  const { id } = await requireSalon();
  if (!/^https:\/\//.test(input.endpoint) || input.endpoint.length > 1000 || !input.p256dh || !input.auth) return { ok: false, error: alertsCopy.push.error };
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", input.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({ member_id: id, endpoint: input.endpoint, keys: { p256dh: input.p256dh, auth: input.auth } });
  if (error) return { ok: false, error: alertsCopy.push.error };
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<RulesResult> {
  await requireSalon();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}
