"use server";

import { createClient } from "@/lib/supabase/server";

/** La guida dell'agenda è stata vista (o saltata): non si ripropone. Sta nei dati dell'account, vale su ogni dispositivo. */
export async function markTourSeen(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { tour_seen: true } });
}
