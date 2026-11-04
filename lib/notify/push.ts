import "server-only";
import { createECDH } from "node:crypto";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushMessage = { title: string; body: string; url: string };

let ready = false;
function configure(): boolean {
  if (ready) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:ciao@taglendo.it", pub, priv);
  ready = true;
  return true;
}

/** Quanti dispositivi ha attivato questo operatore. */
export async function pushDevices(memberId: string): Promise<number> {
  const { count } = await createAdminClient().from("push_subscriptions").select("id", { count: "exact", head: true }).eq("member_id", memberId);
  return count ?? 0;
}

/** Manda la notifica a tutti i dispositivi dell'operatore. Toglie quelli che non esistono più. Restituisce quante sono partite. */
export async function sendPush(memberId: string, message: PushMessage): Promise<number> {
  if (!configure()) return 0;
  const admin = createAdminClient();
  const { data } = await admin.from("push_subscriptions").select("id, endpoint, keys").eq("member_id", memberId);
  let sent = 0;
  for (const sub of data ?? []) {
    const keys = sub.keys as { p256dh?: string; auth?: string };
    if (!keys.p256dh || !keys.auth) continue;
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }, JSON.stringify(message), { TTL: 60 * 60 * 12 });
      sent += 1;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", sub.id);
      else console.error("push non riuscita:", status ?? e);
    }
  }
  return sent;
}

/** La chiave pubblica deve essere quella che nasce dalla privata: se no, le notifiche non arrivano mai. */
export function vapidStatus(): "ok" | "missing" | "mismatch" {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return "missing";
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(priv, "base64url"));
    return ecdh.getPublicKey().toString("base64url") === pub ? "ok" : "mismatch";
  } catch {
    return "mismatch";
  }
}
