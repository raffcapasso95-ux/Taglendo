"use client";

import { useActionState, useState } from "react";
import { setNewPassword, type AuthState } from "@/lib/auth/actions";
import { authCopy } from "@/lib/copy/auth";
import { Button } from "@/components/ui";
import { FormAlert } from "./FormAlert";
import { PasswordField } from "./PasswordField";
import styles from "./Form.module.css";

const initial: AuthState = {};
const copy = authCopy.newPassword;

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, initial);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [repeatTouched, setRepeatTouched] = useState(false);

  const repeatError =
    state.field === "repeat"
      ? state.error
      : repeatTouched && repeat && repeat !== password
        ? copy.mismatch
        : undefined;

  return (
    <form action={action} className={styles.form} noValidate>
      {state.error && !state.field ? <FormAlert>{state.error}</FormAlert> : null}
      <PasswordField
        name="password"
        label={copy.newLabel}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        meter
        autoFocus
        error={state.field === "password" ? state.error : undefined}
      />
      <PasswordField
        name="repeat"
        label={copy.repeatLabel}
        value={repeat}
        onChange={setRepeat}
        onBlur={() => setRepeatTouched(true)}
        autoComplete="new-password"
        error={repeatError}
      />
      <Button type="submit" size="large" fullWidth disabled={pending}>
        {copy.submit}
      </Button>
    </form>
  );
}
