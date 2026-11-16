"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { removeAdmin, setUserBlocked, type AdminResult } from "@/lib/admin/actions";
import type { UserRow } from "@/lib/admin/load";
import { adminCopy } from "@/lib/copy/admin";
import { ActionDialog } from "./ActionDialog";
import { Icon } from "./Icons";
import styles from "./Admin.module.css";

const copy = adminCopy.users;

/** Il menu «⋯» di un'utenza: apri il salone, blocca o sblocca l'accesso, togli dagli amministratori. */
export function UserMenu({ row, self }: { row: UserRow; self: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [ask, setAsk] = useState<"block" | "remove" | null>(null);
  const [message, setMessage] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const label = copy.label(row.name);
  const hasItems = Boolean(row.salon_id) || (!row.is_admin && row.user_id) || (row.is_admin && !self);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const away = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const y0 = window.scrollY;
    const scrolled = () => {
      if (Math.abs(window.scrollY - y0) > 80) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scrolled, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scrolled, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  const toggle = () => {
    if (!open && button.current) {
      const r = button.current.getBoundingClientRect();
      const room = window.innerHeight - r.bottom;
      const right = Math.max(8, window.innerWidth - r.right);
      setPos(room < 260 && r.top > room ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
    }
    setOpen((o) => !o);
  };

  const run = (call: () => Promise<AdminResult>) => {
    setOpen(false);
    setAsk(null);
    start(async () => {
      const r = await call();
      setMessage(r);
      if (r.ok) router.refresh();
    });
  };

  const onKeys = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  if (!hasItems) return null;
  return (
    <>
      <button ref={button} type="button" className={styles.menuBtn} aria-label={label} aria-haspopup="menu" aria-expanded={open} disabled={pending} onClick={toggle}>
        <Icon name="more" size={22} />
      </button>

      {open && pos ? (
        <div ref={panel} role="menu" aria-label={label} className={styles.menu} style={{ top: pos.top, bottom: pos.bottom, right: pos.right }} onKeyDown={onKeys}>
          {row.salon_id ? (
            <Link role="menuitem" href={`/admin/saloni/${row.salon_id}`} onClick={() => setOpen(false)}>
              <Icon name="open" />
              {copy.openSalon}
            </Link>
          ) : null}
          {!row.is_admin && row.user_id ? (
            row.blocked ? (
              <button type="button" role="menuitem" onClick={() => run(() => setUserBlocked(row.user_id!, false, ""))}>
                <Icon name="userCheck" />
                {copy.unblock}
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                className={styles.menuDanger}
                onClick={() => {
                  setOpen(false);
                  setAsk("block");
                }}
              >
                <Icon name="userBlock" />
                {copy.block}
              </button>
            )
          ) : null}
          {row.is_admin && !self ? (
            <button
              type="button"
              role="menuitem"
              className={styles.menuDanger}
              onClick={() => {
                setOpen(false);
                setAsk("remove");
              }}
            >
              <Icon name="shieldOff" />
              {copy.removeAdmin}
            </button>
          ) : null}
        </div>
      ) : null}

      <ActionDialog
        open={ask === "block"}
        title={copy.blockTitle}
        text={copy.blockFor(row.name)}
        field={{ label: copy.blockReason }}
        confirm={adminCopy.actions.confirm}
        tone="danger"
        onClose={() => setAsk(null)}
        onConfirm={(reason) => run(() => setUserBlocked(row.user_id!, true, reason))}
      />
      <ActionDialog
        open={ask === "remove"}
        title={copy.removeTitle}
        text={copy.removeFor(row.email ?? row.name)}
        confirm={adminCopy.actions.confirm}
        tone="danger"
        onClose={() => setAsk(null)}
        onConfirm={() => run(() => removeAdmin(row.user_id!))}
      />

      {message ? (
        <p className={`${styles.toast} ${message.ok ? "" : styles.toastErr}`} role={message.ok ? "status" : "alert"}>
          {message.ok ? message.message : message.error}
        </p>
      ) : null}
    </>
  );
}
