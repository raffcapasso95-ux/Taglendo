"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp, type AuthState } from "@/lib/auth/actions";
import { authCopy } from "@/lib/copy/auth";
import { isEmail, isPersonName, LIMITS } from "@/lib/rules/forms";
import { Button, Checkbox, Field } from "@/components/ui";
import { FormAlert } from "./FormAlert";
import { PasswordField } from "./PasswordField";
import styles from "./Form.module.css";

const initial: AuthState = {};
const copy = authCopy.signUp;

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false });

  const nameError =
    state.field === "name" ? state.error : touched.name && name && !isPersonName(name, LIMITS.memberName) ? authCopy.errors.nameShort : undefined;
  const emailError =
    state.field === "email" ? state.error : touched.email && email && !isEmail(email) ? authCopy.invalidEmail : undefined;

  return (
    <form action={action} className={styles.form} noValidate>
      {state.error && !state.field ? <FormAlert>{state.error}</FormAlert> : null}
      <Field
        size="large"
        name="name"
        label={authCopy.fields.fullName}
        autoComplete="name"
        maxLength={LIMITS.memberName}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, name: true }))}
        error={nameError}
      />
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
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        error={emailError}
      />
      <PasswordField
        name="password"
        label={authCopy.fields.password}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        meter
        error={state.field === "password" ? state.error : undefined}
      />
      <Checkbox
        name="terms"
        checked={terms}
        onChange={setTerms}
        error={state.field === "terms" ? state.error : undefined}
      >
        {copy.termsBefore}{" "}
        <Link href="/termini" target="_blank">
          {copy.terms}
        </Link>{" "}
        {copy.termsMiddle}
        <Link href="/privacy" target="_blank">
          {copy.privacy}
        </Link>
        .
      </Checkbox>
      <Button type="submit" size="large" fullWidth disabled={pending}>
        {copy.submit}
      </Button>
    </form>
  );
}
