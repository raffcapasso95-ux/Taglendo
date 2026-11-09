"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarIcon, LogoutMenuIcon, SettingsRaysIcon } from "@/components/app/Icons";
import { cx } from "@/components/ui/cx";
import { signOut } from "@/lib/auth/actions";
import { marketingCopy } from "@/lib/copy/marketing";
import { clearOfflineData } from "@/lib/offline/clear";
import styles from "./AccountMenu.module.css";

const copy = marketingCopy.account;

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c.8-3.8 3.7-6 7.5-6s6.7 2.2 7.5 6" />
  </svg>
);

export type AccountInfo = {
  name: string;
  initials: string;
  /** Null per chi non ha ancora un salone (primo avvio a metà). */
  salonName: string | null;
  isOwner: boolean;
};

/**
 * Nella testata del sito, per chi è già dentro: un tondo con le iniziali, come nelle app.
 * Al tocco si apre un piccolo menu con l'agenda, le impostazioni, il profilo e «Esci».
 * `tone` dice su che fondo sta il tondo: prugna (home) o chiaro (le altre pagine).
 */
export function AccountMenu({ account, tone }: { account: AccountInfo; tone: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const role = account.salonName ? `${account.isOwner ? copy.owner : copy.barber} · ${account.salonName}` : null;

  return (
    <div ref={root} className={styles.root}>
      <button
        ref={button}
        type="button"
        className={cx(styles.trigger, tone === "dark" ? styles.triggerDark : styles.triggerLight)}
        aria-label={`${copy.open}: ${account.name}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {account.initials}
        </span>
        <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div id={panelId} className={styles.panel} hidden={!open}>
        <div className={styles.who}>
          <span className={cx(styles.avatar, styles.avatarBig)} aria-hidden="true">
            {account.initials}
          </span>
          <span className={styles.whoText}>
            <span className={styles.whoName}>{account.name}</span>
            {role ? <span className={styles.whoRole}>{role}</span> : null}
          </span>
        </div>
        <nav aria-label={copy.open}>
          <Link href="/agenda" className={cx(styles.item, styles.itemMain)} onClick={() => setOpen(false)}>
            <span className={styles.itemIcon} aria-hidden="true">
              <CalendarIcon size={20} />
            </span>
            {copy.agenda}
          </Link>
          <Link href="/impostazioni" className={styles.item} onClick={() => setOpen(false)}>
            <span className={styles.itemIcon} aria-hidden="true">
              <SettingsRaysIcon size={20} />
            </span>
            {copy.settings}
          </Link>
          <Link href="/profilo" className={styles.item} onClick={() => setOpen(false)}>
            <span className={styles.itemIcon} aria-hidden="true">
              <ProfileIcon />
            </span>
            {copy.profile}
          </Link>
        </nav>
        <form action={signOut} onSubmit={clearOfflineData} className={styles.foot}>
          <button type="submit" className={styles.item}>
            <span className={styles.itemIcon} aria-hidden="true">
              <LogoutMenuIcon />
            </span>
            {copy.logout}
          </button>
        </form>
      </div>
    </div>
  );
}
