"use server";

import { revalidatePath } from "next/cache";
import { requireSalon } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { unreadActivity } from "./load";

/** Il numero della campanella, chiesto di tanto in tanto dalla pagina aperta. */
export async function unreadCount(): Promise<number> {
  try {
    return await unreadActivity();
  } catch {
    return 0;
  }
}

/** «Ho letto»: le notifiche fino ad ora non contano più come nuove. */
export async function markActivitySeen(): Promise<void> {
  const { salon } = await requireSalon();
  const supabase = await createClient();
  await supabase.rpc("mark_activity_seen", { p_salon: salon.id });
  revalidatePath("/", "layout");
}
