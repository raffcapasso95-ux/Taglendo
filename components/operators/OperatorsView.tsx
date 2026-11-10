"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Button, Card, Field, ResponsiveDialog, Toggle } from "@/components/ui";
import { FormAlert } from "@/components/auth/FormAlert";
import { operatorsCopy } from "@/lib/copy/operators";
import {
  inviteMember,
  renewInvite,
  revokeInvite,
  setBarberPermission,
  type BarberPermission,
  type InviteResult,
} from "@/lib/operators/actions";
import { LIMITS } from "@/lib/rules/forms";
import styles from "./OperatorsView.module.css";

const copy = operatorsCopy;

export type OperatorRow = {
  id: string;
  name: string;
  role: "owner" | "barber";
  chairNo: number;
  accepted: boolean;
  isMe: boolean;
  email: string | null;
  /** "valid" = invito in corso; "expired" = scaduto; "none" = mai invitato */
  invite: "valid" | "expired" | "none";
};

type Props = {
  salonName: string;
  people: OperatorRow[];
  canAdd: boolean;
  permissions: Record<BarberPermission, boolean>;
};

type Dialog = { kind: "new" } | { kind: "member"; member: OperatorRow } | { kind: "link"; link: string; name: string };

const initial: InviteResult = {};

export function OperatorsView({ salonName, people, canAdd, permissions }: Props) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [perms, setPerms] = useState(permissions);
  const [error, setError] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  const changePermission = (key: BarberPermission, value: boolean) => {
    setPerms((p) => ({ ...p, [key]: value }));
    startTransition(async () => {
      const result = await setBarberPermission(key, value);
      if (result.error) {
        setPerms((p) => ({ ...p, [key]: !value }));
        setError(result.error);
      } else {
        setError(undefined);
      }
    });
  };

  const renew = (m: OperatorRow) =>
    startTransition(async () => {
      const result = await renewInvite(m.id);
      if (result.link) setDialog({ kind: "link", link: result.link, name: result.name ?? m.name });
      else setError(result.error);
    });

  const revoke = (m: OperatorRow) =>
    startTransition(async () => {
      const result = await revokeInvite(m.id);
      setError(result.error);
    });

  const status = (m: OperatorRow) => {
    if (m.role === "owner") return `${m.isMe ? `${copy.you} · ` : ""}${copy.chair(m.chairNo)}`;
    const label = m.accepted
      ? copy.accepted
      : m.invite === "valid"
        ? copy.pending
        : m.invite === "expired"
          ? copy.expired
          : copy.notInvited;
    return `${copy.chair(m.chairNo)} · ${label}`;
  };

  return (
    <main className={styles.page}>
      <Link href="/salone" className={styles.back}>
        <span aria-hidden="true">‹</span> {copy.back}
      </Link>
      <header className={styles.head}>
        <div>
          <p className={styles.salon}>{salonName}</p>
          <h1 className={styles.title}>{copy.title}</h1>
        </div>
        {canAdd ? (
          <Button className={styles.inviteTop} onClick={() => setDialog({ kind: "new" })}>
            {copy.invite}
          </Button>
        ) : null}
      </header>

      {error ? <FormAlert>{error}</FormAlert> : null}

      <div className={styles.columns}>
        <section aria-labelledby="people-title" className={styles.column}>
          <h2 id="people-title" className={styles.label}>
            {copy.people}
          </h2>
          <Card flush>
            {people.map((m) => (
              <div key={m.id} className={styles.person}>
                <div className={styles.who}>
                  <p className={styles.name}>{m.name}</p>
                  <p className={m.role === "barber" && !m.accepted && m.invite !== "none" ? styles.warn : styles.sub}>
                    {status(m)}
                  </p>
                </div>
                {m.role === "owner" ? (
                  <span className={styles.badge}>{copy.owner}</span>
                ) : m.accepted ? null : (
                  <div className={styles.actions}>
                    {m.invite === "none" ? (
                      <button type="button" className={styles.link} onClick={() => setDialog({ kind: "member", member: m })}>
                        {copy.inviteAction}
                      </button>
                    ) : (
                      <>
                        <button type="button" className={styles.link} onClick={() => renew(m)}>
                          {copy.resend}
                        </button>
                        <button type="button" className={styles.linkMuted} onClick={() => revoke(m)}>
                          {copy.revoke}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </Card>
          {canAdd ? (
            <Button variant="secondary" size="large" fullWidth className={styles.inviteBottom} onClick={() => setDialog({ kind: "new" })}>
              {copy.invite}
            </Button>
          ) : (
            <p className={styles.full}>{copy.full}</p>
          )}
        </section>

        <section aria-labelledby="perms-title" className={styles.column}>
          <h2 id="perms-title" className={styles.label}>
            {copy.permissions}
          </h2>
          <Card flush>
            <Toggle label={copy.perms.seeAll} checked={perms.seeAll} onChange={(v) => changePermission("seeAll", v)} />
            <Toggle label={copy.perms.edit} checked={perms.edit} onChange={(v) => changePermission("edit", v)} />
            <Toggle label={copy.perms.contacts} checked={perms.contacts} onChange={(v) => changePermission("contacts", v)} />
            <div className={styles.fixed}>
              <span>{copy.perms.settings}</span>
              <span className={styles.fixedValue}>{copy.perms.ownerOnly}</span>
            </div>
          </Card>
        </section>
      </div>

      {dialog ? <InviteDialog key={dialogKey(dialog)} dialog={dialog} onClose={() => setDialog(null)} /> : null}
    </main>
  );
}

const dialogKey = (d: Dialog) => (d.kind === "member" ? `m-${d.member.id}` : d.kind === "link" ? `l-${d.link}` : "new");

function InviteDialog({ dialog, onClose }: { dialog: Dialog; onClose: () => void }) {
  const [state, action, pending] = useActionState(inviteMember, initial);
  const [name, setName] = useState(dialog.kind === "member" ? dialog.member.name : "");
  const [email, setEmail] = useState(dialog.kind === "member" ? (dialog.member.email ?? "") : "");
  const [copied, setCopied] = useState(false);

  const ready = dialog.kind === "link" ? { link: dialog.link, name: dialog.name } : state.link ? { link: state.link, name: state.name ?? name } : null;
  const title = ready
    ? copy.dialog.readyTitle
    : dialog.kind === "member"
      ? copy.dialog.inviteTitleFor(dialog.member.name)
      : copy.dialog.inviteTitle;

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // senza permesso per gli appunti il link resta selezionabile nel campo
    }
    setCopied(true);
  };

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={title}
      footer={
        ready ? (
          <>
            <Button variant="secondary" size="large" onClick={onClose}>
              {copy.dialog.close}
            </Button>
            <Button size="large" onClick={() => copyLink(ready.link)}>
              {copied ? copy.dialog.copied : copy.dialog.copy}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="large" onClick={onClose}>
              {copy.dialog.close}
            </Button>
            <Button type="submit" form="invite-form" size="large" disabled={pending}>
              {copy.dialog.submit}
            </Button>
          </>
        )
      }
    >
      {ready ? (
        <div className={styles.ready}>
          <p>{copy.dialog.readyText(ready.name)}</p>
          <input className={styles.linkField} readOnly value={ready.link} aria-label={copy.dialog.copy} onFocus={(e) => e.target.select()} />
        </div>
      ) : (
        <form id="invite-form" action={action} className={styles.form} noValidate>
          {dialog.kind === "member" ? <input type="hidden" name="memberId" value={dialog.member.id} /> : null}
          {state.error && !state.field ? <FormAlert>{state.error}</FormAlert> : null}
          <Field
            size="large"
            name="name"
            label={copy.dialog.name}
            maxLength={LIMITS.memberName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={state.field === "name" ? state.error : undefined}
          />
          <Field
            size="large"
            name="email"
            label={copy.dialog.email}
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint={copy.dialog.emailHint}
            error={state.field === "email" ? state.error : undefined}
          />
        </form>
      )}
    </ResponsiveDialog>
  );
}
