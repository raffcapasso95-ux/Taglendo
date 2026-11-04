"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOut } from "@/lib/auth/actions";
import { cx } from "@/components/ui/cx";
import { CalendarIcon, CheckIcon, CopyIcon, LinkIcon, LogoutIcon, ScissorsIcon, SettingsIcon, UsersIcon } from "./Icons";
import styles from "./AppShell.module.css";

const ITEMS = [
  { href: "/agenda", label: "Agenda", short: "Agenda", icon: <CalendarIcon /> },
  { href: "/clienti", label: "Clienti", short: "Clienti", icon: <UsersIcon /> },
  { href: "/link", label: "Link di prenotazione", short: "Link", icon: <LinkIcon /> },
  { href: "/listino", label: "Listino e orari", short: "Altro", icon: <ScissorsIcon /> },
] as const;

type Props = {
  salonName: string;
  /** Indirizzo completo della pagina del salone, da copiare. */
  bookingUrl: string;
  userName: string;
  userInitials: string;
  children: ReactNode;
};

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Su desktop barra laterale sempre chiusa a icone (76 px), con le etichette al passaggio del mouse;
 * su telefono barra in basso: Agenda, Clienti, Link, Altro.
 */
export function AppShell({ salonName, bookingUrl, userName, userInitials, children }: Props) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
    } catch {
      // senza permesso per gli appunti non si copia
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const settingsActive = isCurrent(pathname, "/impostazioni");

  return (
    <div className={styles.shell}>
      <nav className={styles.rail} aria-label="Menu principale">
        <div className={styles.logo} data-label={salonName}>
          <Image src="/brand/taglendo-icon.svg" alt="Taglendo" width={36} height={36} className={styles.logoImage} />
        </div>
        <div className={styles.group}>
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(styles.railItem, isCurrent(pathname, item.href) && styles.railItemActive)}
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              aria-label={item.label}
              data-label={item.label}
            >
              {item.icon}
            </Link>
          ))}
        </div>
        <div className={cx(styles.group, styles.groupBottom)}>
          <button type="button" className={styles.railItem} onClick={copy} aria-label="Copia il link di prenotazione" data-label={copied ? "Link copiato" : "Copia link di prenotazione"}>
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
          <Link
            href="/impostazioni"
            className={cx(styles.railItem, settingsActive && styles.railItemActive)}
            aria-current={settingsActive ? "page" : undefined}
            aria-label="Impostazioni"
            data-label="Impostazioni"
          >
            <SettingsIcon />
          </Link>
          <Link href="/profilo" className={styles.railItem} aria-label={`Profilo di ${userName}`} data-label={userName}>
            <span className={styles.avatar}>{userInitials}</span>
          </Link>
          <form action={signOut}>
            <button type="submit" className={styles.railItem} aria-label="Esci" data-label="Esci">
              <LogoutIcon />
            </button>
          </form>
        </div>
      </nav>

      <div className={styles.content}>{children}</div>

      <nav className={styles.tabbar} aria-label="Menu principale">
        {ITEMS.map((item) => {
          const active = isCurrent(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={cx(styles.tab, active && styles.tabActive)} aria-current={active ? "page" : undefined}>
              <span className={styles.tabBar} aria-hidden="true" />
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
