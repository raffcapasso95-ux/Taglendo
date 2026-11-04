"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import listino from "@/components/listino/Listino.module.css";
import rules from "@/components/settings/Rules.module.css";
import { Button, Card, Field, ResponsiveDialog, ToastProvider, useToast } from "@/components/ui";
import { profileCopy as copy } from "@/lib/copy/profile";
import { changePassword, confirmEmailChange, deleteAccount, requestEmailChange, saveName, type ProfileResult } from "@/lib/profile/actions";
import { isDeleteConfirmed } from "@/lib/rules/profile";
import styles from "./Profile.module.css";

type Props = { name: string; email: string; passwordAgo: string; isOwner: boolean; salonName: string };

export function ProfileView(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

type Dialog = "code" | "password" | "delete" | null;

function Inner({ name: initialName, email: currentEmail, passwordAgo, isOwner, salonName }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(currentEmail);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});

  const dirty = name.trim() !== initialName || email.trim().toLowerCase() !== currentEmail.toLowerCase();

  const submit = () =>
    start(async () => {
      setErrors({});
      let saved = false;
      if (name.trim() !== initialName) {
        const r = await saveName(name);
        if (!r.ok) return setErrors(r.field === "name" ? { name: r.error } : { form: r.error });
        saved = true;
      }
      if (email.trim().toLowerCase() !== currentEmail.toLowerCase()) {
        const r = await requestEmailChange(email);
        if (!r.ok) return setErrors(r.field === "email" ? { email: r.error } : { form: r.error });
        setDialog("code");
        return;
      }
      if (saved) {
        toast(copy.saved);
        router.refresh();
      }
    });

  return (
    <main className={listino.page}>
      <header className={listino.head}>
        <Link href="/impostazioni" className={rules.back}>
          ‹ {copy.back}
        </Link>
        <p className={listino.eyebrow}>{initialName}</p>
        <h1 className={listino.title}>{copy.title}</h1>
        <p className={listino.note}>{copy.sub}</p>
      </header>

      <div className={styles.columns}>
        <section className={listino.section} aria-labelledby="me-title">
          <h2 id="me-title" className={listino.sectionTitle}>
            {copy.section}
          </h2>
          <Card>
            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <Field label={copy.name} name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={40} error={errors.name} />
              <Field label={copy.email} name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" hint={copy.emailHint} error={errors.email} />
              {errors.form ? (
                <p className={styles.error} role="alert">
                  {errors.form}
                </p>
              ) : null}
              <Button type="submit" size="large" disabled={pending || !dirty}>
                {copy.save}
              </Button>
            </form>
          </Card>
        </section>

        <div className={styles.col}>
          <section className={listino.section} aria-labelledby="sec-title">
            <h2 id="sec-title" className={listino.sectionTitle}>
              {copy.security}
            </h2>
            <Card flush>
              <button type="button" className={listino.navRowButton} onClick={() => setDialog("password")}>
                <span>
                  {copy.password}
                  <span className={listino.navSub}>{copy.passwordChanged(passwordAgo)}</span>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            </Card>
          </section>

          <section className={listino.section} aria-labelledby="acc-title">
            <h2 id="acc-title" className={listino.sectionTitle}>
              {copy.account}
            </h2>
            <Card flush>
              <a href="/profilo/esporta" className={listino.navRow} download>
                <span>{copy.export}</span>
                <span aria-hidden="true">›</span>
              </a>
              <button type="button" className={`${listino.navRowButton} ${styles.dangerRow}`} onClick={() => setDialog("delete")}>
                <span>{copy.delete}</span>
                <span aria-hidden="true">›</span>
              </button>
            </Card>
          </section>
        </div>
      </div>

      {dialog === "code" ? (
        <EmailCodeDialog
          email={email.trim().toLowerCase()}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            toast(copy.emailChange.done);
            router.refresh();
          }}
        />
      ) : null}
      {dialog === "password" ? (
        <PasswordDialog
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            toast(copy.passwordDialog.done);
            router.refresh();
          }}
        />
      ) : null}
      {dialog === "delete" ? <DeleteDialog isOwner={isOwner} salonName={salonName} onClose={() => setDialog(null)} /> : null}
    </main>
  );
}

/** Esegue un'azione del server dentro una finestra e ne mostra l'errore. */
function useAction(run: () => Promise<ProfileResult>, onDone: () => void) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const go = () =>
    start(async () => {
      setError(null);
      const r = await run();
      if (!r.ok) return setError(r.error);
      onDone();
    });
  return { pending, error, go };
}

function Body({ children, onSubmit }: { children: ReactNode; onSubmit: () => void }) {
  return (
    <form
      className={styles.dialogBody}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

function EmailCodeDialog({ email, onClose, onDone }: { email: string; onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState("");
  const { pending, error, go } = useAction(() => confirmEmailChange(email, code), onDone);
  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={copy.emailChange.title}
      footer={
        <div className={styles.footer}>
          <Button size="large" disabled={pending || code.replace(/\D/g, "").length !== 6} onClick={go}>
            {copy.emailChange.confirm}
          </Button>
          <Button size="large" variant="secondary" onClick={onClose}>
            {copy.del.cancel}
          </Button>
        </div>
      }
    >
      <Body onSubmit={go}>
        <p className={listino.note}>{copy.emailChange.text(email)}</p>
        <Field label={copy.emailChange.code} name="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={7} error={error ?? undefined} autoFocus />
      </Body>
    </ResponsiveDialog>
  );
}

function PasswordDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [fieldError, setFieldError] = useState<{ password?: string; repeat?: string }>({});
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const go = () =>
    start(async () => {
      setError(null);
      setFieldError({});
      const r = await changePassword(password, repeat);
      if (r.ok) return onDone();
      if (r.field === "password" || r.field === "repeat") setFieldError({ [r.field]: r.error });
      else setError(r.error);
    });
  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={copy.passwordDialog.title}
      footer={
        <div className={styles.footer}>
          <Button size="large" disabled={pending || !password} onClick={go}>
            {copy.passwordDialog.save}
          </Button>
          <Button size="large" variant="secondary" onClick={onClose}>
            {copy.del.cancel}
          </Button>
        </div>
      }
    >
      <Body onSubmit={go}>
        <PasswordField name="password" label={copy.passwordDialog.new} value={password} onChange={setPassword} error={fieldError.password} meter autoComplete="new-password" autoFocus />
        <PasswordField name="repeat" label={copy.passwordDialog.repeat} value={repeat} onChange={setRepeat} error={fieldError.repeat} autoComplete="new-password" />
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </Body>
    </ResponsiveDialog>
  );
}

function DeleteDialog({ isOwner, salonName, onClose }: { isOwner: boolean; salonName: string; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const { pending, error, go } = useAction(() => deleteAccount(typed), () => {});
  const ok = isDeleteConfirmed(typed);
  const lines = isOwner ? copy.del.owner(salonName) : copy.del.barber;
  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={copy.del.title}
      footer={
        <div className={styles.footer}>
          <Button size="large" variant="danger" disabled={pending || !ok} onClick={go}>
            {copy.del.confirm}
          </Button>
          <Button size="large" variant="secondary" onClick={onClose}>
            {copy.del.cancel}
          </Button>
        </div>
      }
    >
      <Body onSubmit={() => ok && go()}>
        <ul className={styles.list}>
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {isOwner ? (
          <div className={styles.before}>
            <p className={styles.beforeTitle}>{copy.del.before}</p>
            <p className={styles.beforeText}>{copy.del.exportHint}</p>
            <a href="/clienti/esporta" download className={styles.linkButton}>
              {copy.del.exportClients}
            </a>
          </div>
        ) : null}
        <Field label={copy.del.confirmLabel} name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </Body>
    </ResponsiveDialog>
  );
}
