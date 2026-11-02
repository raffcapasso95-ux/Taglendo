"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { signIn, type AuthState } from "@/lib/auth/actions";
import { authCopy } from "@/lib/copy/auth";
import { isEmail } from "@/lib/rules/forms";
import { Button, Checkbox, Field } from "@/components/ui";
import { FormAlert } from "./FormAlert";
import { PasswordField } from "./PasswordField";
import { SocialButtons } from "./SocialButtons";
import styles from "./Form.module.css";

const initial: AuthState = {};

export function SignInForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(signIn, initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailError =
    state.field === "email" ? state.error : emailTouched && email && !isEmail(email) ? authCopy.invalidEmail : undefined;

  return (
    <>
      <form action={action} className={styles.form} noValidate>
        <input type="hidden" name="next" value={next} />
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
          onBlur={() => setEmailTouched(true)}
          error={emailError}
        />
        <PasswordField
          name="password"
          label={authCopy.fields.password}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={state.field === "password" ? state.error : undefined}
        />
        <div className={styles.rememberRow}>
          <Checkbox name="remember" checked={remember} onChange={setRemember}>
            {authCopy.signIn.remember}
          </Checkbox>
          <Link href="/password" className={styles.forgot}>
            {authCopy.signIn.forgot}
          </Link>
        </div>
        <Button type="submit" size="large" fullWidth disabled={pending}>
          {authCopy.signIn.submit}
        </Button>
      </form>
      <SocialButtons next={next || undefined} />
    </>
  );
}
