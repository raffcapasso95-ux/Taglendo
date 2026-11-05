"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { FormAlert } from "@/components/auth/FormAlert";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button, Field } from "@/components/ui";
import { gateCopy } from "@/lib/copy/gate";
import { gateLogin, type GateState } from "@/lib/gate-actions";
import styles from "./Gate.module.css";

const initial: GateState = {};

export function GateForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(gateLogin, initial);
  const copy = gateCopy.login;
  const [password, setPassword] = useState("");

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="next" value={next} />
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <Field size="large" name="user" label={copy.user} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
      <PasswordField name="password" label={copy.password} value={password} onChange={setPassword} autoComplete="current-password" />
      <Button type="submit" size="large" disabled={pending}>
        {copy.submit}
      </Button>
    </form>
  );
}

