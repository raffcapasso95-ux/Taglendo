"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { adminSignIn, type AdminSignInState } from "@/lib/admin/actions";
import { adminCopy } from "@/lib/copy/admin";
import { Button, Field } from "@/components/ui";
import { PasswordField } from "@/components/auth/PasswordField";
import styles from "./Admin.module.css";

const copy = adminCopy.signIn;

export function AdminSignIn() {
  const [state, action, pending] = useActionState<AdminSignInState, FormData>(adminSignIn, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form action={action} noValidate>
      {state.error ? (
        <p className={styles.alert} role="alert">
          {state.error}
        </p>
      ) : null}
      <Field size="large" name="email" label={copy.email} type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
      <PasswordField name="password" label={copy.password} value={password} onChange={setPassword} autoComplete="current-password" />
      <Button type="submit" size="large" fullWidth disabled={pending}>
        {copy.submit}
      </Button>
      <Link href="/password" className={styles.forgot}>
        {copy.forgot}
      </Link>
    </form>
  );
}
