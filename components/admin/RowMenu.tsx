"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { extendTrial, setHidden, setSuspended, type AdminResult } from "@/lib/admin/actions";
import { adminCopy } from "@/lib/copy/admin";
import { ActionDialog } from "./ActionDialog";
import { Icon } from "./Icons";
import styles from "./Admin.module.css";

const copy = adminCopy.rowMenu;

type Salon = { id: string; name: string; slug: string; hidden: boolean; suspended: boolean };

/** Il menu «⋯» di una riga: le azioni di tutti i giorni senza aprire la scheda. */
export function RowMenu({ salon }: { salon: Salon }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [message, setMessage] = useState<AdminResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    button.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const away = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const y0 = window.scrollY;
    const scrolled = () => {
      if (Math.abs(window.scrollY - y0) > 80) setOpen(false);
    };
    const move = () => setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scrolled, true);
    window.addEventListener("resize", move);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scrolled, true);
      window.removeEventListener("resize", move);
    };
  }, [open, close]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(t);
  }, [message]);

  const toggle = () => {
    if (!open && button.current) {
      const r = button.current.getBoundingClientRect();
      // sotto il pulsante; se in basso non c'è posto, sopra
      const room = window.innerHeight - r.bottom;
      const right = Math.max(8, window.innerWidth - r.right);
      setPos(room < 360 && r.top > room ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
    }
    setOpen((o) => !o);
  };

  const run = (call: () => Promise<AdminResult>, after?: () => void) => {
    setOpen(false);
    start(async () => {
      const r = await call();
      setMessage(r);
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  };

  const onKeys = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  return (
    <>
      <button ref={button} type="button" className={styles.menuBtn} aria-label={copy.label(salon.name)} aria-haspopup="menu" aria-expanded={open} disabled={pending} onClick={toggle}>
        <Icon name="more" size={22} />
      </button>

      {open && pos ? (
        <div ref={panel} role="menu" aria-label={copy.label(salon.name)} className={styles.menu} style={{ top: pos.top, bottom: pos.bottom, right: pos.right }} onKeyDown={onKeys}>
          <Link role="menuitem" href={`/admin/saloni/${salon.id}`} onClick={() => setOpen(false)}>
            <Icon name="open" />
            {copy.open}
          </Link>
          {salon.suspended ? null : (
            <Link role="menuitem" href={`/${salon.slug}`} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
              <Icon name="external" />
              {copy.publicPage}
            </Link>
          )}
          <hr />
          <button type="button" role="menuitem" onClick={() => run(() => setHidden(salon.id, !salon.hidden, ""))}>
            <Icon name={salon.hidden ? "eye" : "eyeOff"} />
            {salon.hidden ? copy.show : copy.hide}
          </button>
          <button type="button" role="menuitem" onClick={() => run(() => extendTrial(salon.id, 7, ""))}>
            <Icon name="clock" />
            {copy.extend7}
          </button>
          <button type="button" role="menuitem" onClick={() => run(() => extendTrial(salon.id, 15, ""))}>
            <Icon name="clock" />
            {copy.extend15}
          </button>
          <hr />
          {salon.suspended ? (
            <button type="button" role="menuitem" onClick={() => run(() => setSuspended(salon.id, false, ""))}>
              <Icon name="play" />
              {copy.reactivate}
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className={styles.menuDanger}
              onClick={() => {
                setOpen(false);
                setAsking(true);
              }}
            >
              <Icon name="pause" />
              {copy.suspend}
            </button>
          )}
        </div>
      ) : null}

      <ActionDialog
        open={asking}
        title={copy.suspendTitle}
        text={copy.suspendFor(salon.name)}
        field={{ label: adminCopy.actions.reasonLabel }}
        confirm={adminCopy.actions.confirm}
        tone="danger"
        onClose={() => setAsking(false)}
        onConfirm={(reason) => {
          setAsking(false);
          run(() => setSuspended(salon.id, true, reason));
        }}
      />

      {message ? (
        <p className={`${styles.toast} ${message.ok ? "" : styles.toastErr}`} role={message.ok ? "status" : "alert"}>
          {message.ok ? message.message : message.error}
        </p>
      ) : null}
    </>
  );
}
