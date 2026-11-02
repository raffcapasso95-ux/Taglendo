"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { resendCode, verifyCode, type AuthState } from "@/lib/auth/actions";
import { authCopy } from "@/lib/copy/auth";
import { Button } from "@/components/ui";
import { CodeInput } from "./CodeInput";
import { FormAlert } from "./FormAlert";
import styles from "./Form.module.css";

const initial: AuthState = {};
const copy = authCopy.verify;
const RESEND_SECONDS = 60;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function VerifyForm() {
  const [state, action, pending] = useActionState(verifyCode, initial);
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(RESEND_SECONDS);
  const [resendError, setResendError] = useState<string | undefined>();
  const [resending, startResend] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Si conferma da solo all'ultima cifra. Va fatto dopo che il campo nascosto ha il codice completo.
  useEffect(() => {
    if (code.length === 6) formRef.current?.requestSubmit();
  }, [code]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const resend = () =>
    startResend(async () => {
      const result = await resendCode();
      setResendError(result.error);
      if (!result.error) setWait(RESEND_SECONDS);
    });

  return (
    <>
      <form ref={formRef} action={action} className={styles.form} noValidate>
        {state.error && !state.field ? <FormAlert>{state.error}</FormAlert> : null}
        <CodeInput
          name="code"
          label={copy.codeLabel}
          error={state.field === "code" ? state.error : undefined}
          onChange={setCode}
        />
        <Button type="submit" size="large" fullWidth disabled={pending || code.length < 6}>
          {copy.submit}
        </Button>
      </form>
      <p className={styles.note}>
        {copy.notArrived}{" "}
        {wait > 0 ? (
          <strong>
            {copy.resendIn} {clock(wait)}
          </strong>
        ) : (
          <button type="button" className={styles.linkButton} onClick={resend} disabled={resending}>
            {copy.resend}
          </button>
        )}
        .
      </p>
      {resendError ? <FormAlert>{resendError}</FormAlert> : null}
      <p className={styles.note}>
        {copy.wrongEmail}{" "}
        <Link href="/registrati" className={styles.underline}>
          {copy.change}
        </Link>
      </p>
    </>
  );
}
