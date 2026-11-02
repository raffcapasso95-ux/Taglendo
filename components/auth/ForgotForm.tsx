"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { requestPasswordReset, type AuthState } from "@/lib/auth/actions";
import { authCopy } from "@/lib/copy/auth";
import { isEmail } from "@/lib/rules/forms";
import { Button, Field } from "@/components/ui";
import { FormAlert } from "./FormAlert";
import styles from "./Form.module.css";

const initial: AuthState = {};
const copy = authCopy.forgot;

export function ForgotForm() {
  const linkExpired = useSearchParams().get("errore") === "link";
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const emailError =
    state.field === "email" ? state.error : touched && email && !isEmail(email) ? authCopy.invalidEmail : undefined;

  return (
    <form action={action} className={styles.form} noValidate>
      {linkExpired && !state.sent ? <FormAlert>{authCopy.errors.linkExpired}</FormAlert> : null}
      {state.error && !state.field ? <FormAlert>{state.error}</FormAlert> : null}
      <Field
        size="large"
        name="email"
        label={authCopy.fields.email}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => setTouched(true)}
        error={emailError}
      />
      {state.sent ? (
        <>
          <div className={styles.success} role="status">
            <span className={styles.successIcon} aria-hidden="true">
              ✓
            </span>
            <div>
              <strong>{copy.sentTitle}</strong>
              <p>{copy.sentText}</p>
            </div>
          </div>
          <a href="mailto:" className={styles.phoneOnly}>
            <Button type="button" size="large" fullWidth tabIndex={-1}>
              {copy.openMail}
            </Button>
          </a>
          <Link href="/accedi" className={styles.block}>
            <Button type="button" variant="secondary" size="large" fullWidth tabIndex={-1}>
              {copy.backToSignIn}
            </Button>
          </Link>
        </>
      ) : (
        <Button type="submit" size="large" fullWidth disabled={pending}>
          {copy.submit}
        </Button>
      )}
    </form>
  );
}
