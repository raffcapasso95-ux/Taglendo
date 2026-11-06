"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import listino from "@/components/listino/Listino.module.css";
import { CameraIcon, CheckIcon, ChairIcon, ClockIcon, DownloadIcon, GlobeIcon, LockIcon, TrashIcon } from "@/components/settings/SettingsIcons";
import settings from "@/components/settings/Settings.module.css";
import rules from "@/components/settings/Rules.module.css";
import field from "@/components/ui/Field.module.css";
import { Button, Field, ResponsiveDialog, ToastProvider, useToast } from "@/components/ui";
import toggle from "@/components/ui/Toggle.module.css";
import agenda from "@/components/agenda/Agenda.module.css";
import { cx } from "@/components/ui/cx";
import { resizePhoto } from "@/lib/clients/resizeImage";
import { profileCopy as copy } from "@/lib/copy/profile";
import { changePassword, confirmEmailChange, deleteAccount, requestEmailChange, saveMemberProfile, saveName, setBookableOnline, setMemberPhoto, type ProfileResult } from "@/lib/profile/actions";
import { clientInitials } from "@/lib/rules/avatar";
import { isDeleteConfirmed } from "@/lib/rules/profile";
import styles from "./Profile.module.css";

type Props = {
  name: string;
  email: string;
  phone: string;
  color: number;
  bookable: boolean;
  photoUrl: string | null;
  passwordAgo: string;
  isOwner: boolean;
  salonName: string;
  chair: number;
  hoursDays: string;
  since: string;
  stats: { month: string; clients: number; revenue: string; next: string | null };
};

export function ProfileView(props: Props) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}

type Dialog = "code" | "password" | "delete" | null;

const OPS = ["op0", "op1", "op2", "op3"] as const;

function Row({ tone, icon, label, sub, children, className }: { tone: 0 | 1 | 2 | 3; icon: ReactNode; label: string; sub?: string; children?: ReactNode; className?: string }) {
  return (
    <>
      <span className={cx(settings.icon, settings[`t${tone}` as "t0"], className)}>{icon}</span>
      <span className={settings.text}>
        <span className={settings.label}>{label}</span>
        {sub ? <span className={settings.sub}>{sub}</span> : null}
      </span>
      {children ?? (
        <span className={settings.chev} aria-hidden="true">
          ›
        </span>
      )}
    </>
  );
}

function Inner({ name: initialName, email: currentEmail, phone: initialPhone, color: initialColor, bookable: initialBookable, photoUrl, passwordAgo, isOwner, salonName, chair, hoursDays, since, stats }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [color, setColor] = useState(initialColor);
  const [bookable, setBookable] = useState(initialBookable);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; form?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty =
    name.trim() !== initialName ||
    email.trim().toLowerCase() !== currentEmail.toLowerCase() ||
    phone.trim() !== initialPhone ||
    color !== initialColor;

  const submit = () =>
    start(async () => {
      setErrors({});
      let saved = false;
      if (name.trim() !== initialName) {
        const r = await saveName(name);
        if (!r.ok) return setErrors(r.field === "name" ? { name: r.error } : { form: r.error });
        saved = true;
      }
      if (phone.trim() !== initialPhone || color !== initialColor) {
        const r = await saveMemberProfile({ phone, color });
        if (!r.ok) return setErrors(r.field === "phone" ? { phone: r.error } : { form: r.error });
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

  const changePhoto = (file: File | undefined) => {
    if (!file) return;
    start(async () => {
      try {
        const blob = await resizePhoto(file);
        const form = new FormData();
        form.set("photo", new File([blob], "foto.jpg", { type: "image/jpeg" }));
        const r = await setMemberPhoto(form);
        if (!r.ok) return setErrors({ form: r.error });
        router.refresh();
      } catch {
        setErrors({ form: "La foto non va bene: scegli un’immagine più piccola (JPG, PNG o WebP)." });
      }
    });
  };

  const toggleBookable = () => {
    const next = !bookable;
    setBookable(next);
    start(async () => {
      const r = await setBookableOnline(next);
      if (!r.ok) {
        setBookable(!next);
        return setErrors({ form: r.error });
      }
      toast(next ? copy.onlineOn : copy.onlineOff);
      router.refresh();
    });
  };

  const role = `${isOwner ? copy.hero.owner : copy.hero.barber} · ${copy.hero.chair(chair)} · ${salonName}`;

  return (
    <main className={cx(listino.page, settings.page, settings.pfPage)}>
      <header className={listino.head}>
        <Link href="/impostazioni" className={rules.back}>
          ‹ {copy.back}
        </Link>
        <h1 className={listino.title}>{copy.title}</h1>
      </header>

      <div className={settings.pfColumns}>
        <div className={settings.pfCol}>
          <section className={settings.pfHero} aria-label={copy.hero.label}>
            <div className={settings.pfAvatarWrap}>
              <span className={settings.pfAvatar} style={photoUrl ? { backgroundImage: `url("${photoUrl}")`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : undefined} aria-hidden="true">
                {clientInitials(initialName)}
              </span>
              <button type="button" className={settings.pfPhoto} aria-label={copy.hero.photo} onClick={() => fileRef.current?.click()}>
                <CameraIcon />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => changePhoto(e.target.files?.[0])} />
            </div>
            <div className={settings.pfWho}>
              <p className={settings.pfName}>{initialName}</p>
              <p className={settings.pfRole}>{role}</p>
              <p className={settings.pfSince}>{copy.hero.since(since)}</p>
            </div>
            <dl className={settings.pfStats}>
              <div>
                <dt>{copy.hero.clients(stats.month)}</dt>
                <dd>{stats.clients}</dd>
              </div>
              <div>
                <dt>{copy.hero.revenue(stats.month)}</dt>
                <dd>{stats.revenue.replace(/\s/g, "\u00a0")}</dd>
              </div>
              <div>
                <dt>{copy.hero.next}</dt>
                <dd>{stats.next ?? copy.hero.nextNone}</dd>
              </div>
            </dl>
          </section>

          <section className={settings.section} aria-labelledby="me-title">
            <h2 className={settings.title} id="me-title">
              {copy.personal}
            </h2>
            <form
              className={settings.pfForm}
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <Field label={copy.name} name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={40} error={errors.name} />
              <Field label={copy.email} name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" hint={copy.emailHint} error={errors.email} />
              <Field label={copy.phone} name="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={20} error={errors.phone} />
              <div className={field.field}>
                <span className={field.label}>{copy.color}</span>
                <div className={settings.pfColors} role="group" aria-label={copy.color}>
                  {copy.colors.map((label, i) => (
                    <button key={label} type="button" className={cx(settings.pfColor, agenda[OPS[i]!])} aria-pressed={color === i} aria-label={label} onClick={() => setColor(i)}>
                      {color === i ? <CheckIcon /> : null}
                    </button>
                  ))}
                </div>
              </div>
              {errors.form ? (
                <p className={styles.error} role="alert">
                  {errors.form}
                </p>
              ) : null}
              <Button type="submit" size="large" disabled={pending || !dirty}>
                {copy.save}
              </Button>
            </form>
          </section>
        </div>

        <div className={settings.pfCol}>
          <section className={settings.section} aria-labelledby="work-title">
            <h2 className={settings.title} id="work-title">
              {copy.work}
            </h2>
            <div className={settings.group}>
              <Link className={settings.row} href="/impostazioni/operatori">
                <Row tone={0} icon={<ChairIcon />} label={copy.chairRow} sub={copy.hero.chair(chair)} />
              </Link>
              <Link className={settings.row} href="/listino/orari">
                <Row tone={1} icon={<ClockIcon />} label={copy.hoursRow} sub={copy.hoursSub(hoursDays)} />
              </Link>
              <button type="button" role="switch" aria-checked={bookable} className={cx(settings.row, settings.rowButton, settings.pfSwitch)} onClick={toggleBookable}>
                <Row tone={2} icon={<GlobeIcon />} label={copy.online} sub={copy.onlineSub}>
                  <span className={cx(toggle.track, settings.Toggle_track)} aria-hidden="true">
                    <span className={cx(toggle.knob, settings.Toggle_knob)} />
                  </span>
                </Row>
              </button>
            </div>
          </section>

          <section className={settings.section} aria-labelledby="sec-title">
            <h2 className={settings.title} id="sec-title">
              {copy.security}
            </h2>
            <div className={settings.group}>
              <button type="button" className={cx(settings.row, settings.rowButton)} onClick={() => setDialog("password")}>
                <Row tone={3} icon={<LockIcon />} label={copy.password} sub={copy.passwordChanged(passwordAgo)} />
              </button>
            </div>
          </section>

          <section className={settings.section} aria-labelledby="plan-title">
            <h2 className={settings.title} id="plan-title">
              {copy.plan.title}
            </h2>
            <div className={settings.pfPlan}>
              <div className={settings.pfPlanTop}>
                <span className={settings.pfPlanName}>{copy.plan.name}</span>
                <span className={settings.pfPlanBadge}>{copy.plan.badge}</span>
              </div>
              <p className={settings.pfPlanSub}>{copy.plan.sub}</p>
            </div>
          </section>

          <section className={settings.section} aria-labelledby="acc-title">
            <h2 className={settings.title} id="acc-title">
              {copy.account}
            </h2>
            <div className={settings.group}>
              <a className={settings.row} href="/profilo/esporta" download>
                <Row tone={3} icon={<DownloadIcon />} label={copy.export} sub={copy.exportSub} />
              </a>
              <button type="button" className={cx(settings.row, settings.rowButton, settings.rowDanger)} onClick={() => setDialog("delete")}>
                <Row tone={3} icon={<TrashIcon />} label={copy.delete} />
              </button>
            </div>
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
