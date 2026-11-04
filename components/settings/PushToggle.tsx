"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, useToast } from "@/components/ui";
import { alertsCopy } from "@/lib/copy/notify";
import { removePushSubscription, savePushSubscription } from "@/lib/settings/actions";
import styles from "./Rules.module.css";

const copy = alertsCopy.push;

type State = "checking" | "unsupported" | "ios" | "nokey" | "blocked" | "off" | "on";

const toKey = (base64: string): Uint8Array<ArrayBuffer> => {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

async function currentState(vapid: string | undefined): Promise<State> {
  await Promise.resolve();
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return isIos() && !standalone() ? "ios" : "unsupported";
  if (!vapid) return "nokey";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** Attiva o spegne le notifiche su questo dispositivo. */
export function PushToggle({ vapidKey }: { vapidKey: string | undefined }) {
  const toast = useToast();
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  useEffect(() => {
    let cancelled = false;
    currentState(vapidKey).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  const enable = () =>
    startBusy(async () => {
      setError(null);
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "off");
        const reg = (await navigator.serviceWorker.getRegistration("/sw.js")) ?? (await navigator.serviceWorker.register("/sw.js"));
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(vapidKey!) }));
        const json = sub.toJSON();
        const r = await savePushSubscription({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" });
        if (!r.ok) return setError(r.error);
        setState("on");
        toast(copy.enabledToast);
      } catch {
        setError(copy.error);
      }
    });

  const disable = () =>
    startBusy(async () => {
      setError(null);
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setState("off");
        toast(copy.disabledToast);
      } catch {
        setError(copy.error);
      }
    });

  const message = { checking: "", unsupported: copy.unsupported, ios: copy.ios, nokey: copy.noKey, blocked: copy.blocked, off: copy.off, on: copy.on }[state];

  return (
    <div className={styles.rule}>
      <span className={styles.ruleText}>
        <span className={styles.ruleLabel}>{copy.title}</span>
        <span className={styles.ruleHint} aria-live="polite">{message}</span>
      </span>
      {state === "off" ? <Button size="large" disabled={busy} onClick={enable}>{copy.enable}</Button> : null}
      {state === "on" ? <Button variant="secondary" size="large" disabled={busy} onClick={disable}>{copy.disable}</Button> : null}
      {error ? <span className={styles.ruleHint} role="alert">{error}</span> : null}
    </div>
  );
}
