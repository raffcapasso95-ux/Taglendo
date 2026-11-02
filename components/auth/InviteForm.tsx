"use client";

import { useActionState, useState } from "react";
import { acceptInvite, type AcceptState } from "@/lib/operators/accept";
import { authCopy } from "@/lib/copy/auth";
import { LIMITS } from "@/lib/rules/forms";
import { Button, Field } from "@/components/ui";
import { FormAlert } from "./FormAlert";
import { PasswordField } from "./PasswordField";
import styles from "./Form.module.css";

const initial: AcceptState = {};
const copy = authCopy.invite;

type Props = { token: string; name: string; email: string };

export function InviteForm({ token, name: initialName, email }: Props) {
  const [state, action, pending] = useActionState(acceptInvite, initial);
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");

  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="token" value={token} />
      {state.error && !state.field ? <FormAlert>{state.error}</FormAlert> : null}
      <Field
        size="large"
        name="name"
        label={copy.name}
        autoComplete="name"
        maxLength={LIMITS.memberName}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={state.field === "name" ? state.error : undefined}
      />
      <Field size="large" label={copy.email} type="email" value={email} readOnly disabled hint={copy.emailNote} />
      <PasswordField
        name="password"
        label={copy.password}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        error={state.field === "password" ? state.error : undefined}
      />
      <Button type="submit" size="large" fullWidth disabled={pending}>
        {copy.submit}
      </Button>
    </form>
  );
}
