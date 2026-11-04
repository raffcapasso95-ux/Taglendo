"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button, Field, ResponsiveDialog } from "@/components/ui";
import { sessionCopy as copy } from "@/lib/copy/session";

const EVERY_MS = 5 * 60 * 1000;

/**
 * Controlla ogni tanto che la sessione valga ancora (e subito quando si torna sull'app o torna la rete).
 * Se è scaduta chiede solo la password in una finestra: la pagina sotto non si tocca.
 */
export function SessionGuard() {
  const router = useRouter();
  const known = useRef(false);
  const [email, setEmail] = useState("");
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/session", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { valid: boolean; email: string | null };
      if (body.valid) {
        if (body.email) {
          known.current = true;
          setEmail(body.email);
        }
        setExpired(false);
      } else if (known.current) {
        setExpired(true);
      }
    } catch {
      // senza rete non si sa: non si dice che la sessione è scaduta
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(check, 0);
    const timer = window.setInterval(check, EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  }, [check]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reauth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!res.ok) {
        setBusy(false);
        return setError(res.status === 401 ? copy.wrong : copy.generic);
      }
    } catch {
      setBusy(false);
      return setError(copy.network);
    }
    setBusy(false);
    setPassword("");
    setExpired(false);
    router.refresh();
  };

  if (!expired) return null;
  return (
    <ResponsiveDialog open onClose={() => {}} title={copy.title}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text-secondary)" }}>{copy.text}</p>
        <Field size="large" label={copy.email} value={email} readOnly type="email" autoComplete="username" />
        <PasswordField name="password" label={copy.password} value={password} onChange={setPassword} autoComplete="current-password" autoFocus error={error ?? undefined} />
        <Button type="submit" size="large" disabled={busy || !password}>
          {copy.submit}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
