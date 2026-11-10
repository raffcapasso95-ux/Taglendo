"use server";

import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** «Ho letto»: le notifiche fino ad ora non contano più come nuove. */
export async function markActivitySeen(): Promise<void> {
  const { salon } = await requireSalon();
  const supabase = await createClient();
  await supabase.rpc("mark_activity_seen", { p_salon: salon.id });
  revalidatePath("/", "layout");
}
