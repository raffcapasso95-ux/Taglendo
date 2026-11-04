"use server";

import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
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
