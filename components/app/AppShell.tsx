"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { signOut } from "@/lib/auth/actions";
import { cx } from "@/components/ui/cx";
import { OfflineSync } from "@/components/offline/OfflineSync";
import { SwRegister } from "@/components/offline/SwRegister";
import { clearOfflineData } from "@/lib/offline/clear";
import { romeDate } from "@/lib/dates/rome";
import { SessionGuard } from "./SessionGuard";
import {
  CalendarIcon,
  CheckIcon,
  CheckMarkIcon,
  CloseIcon,
  BellNavIcon,
  CopyIcon,
  HomeIcon,
  StoreIcon,
  LogoutIcon,
  LogoutMenuIcon,
  MenuIcon,
  ScissorsIcon,
  SettingsIcon,
  SettingsRaysIcon,
  StatsIcon,
  UsersIcon,
} from "./Icons";
import styles from "./AppShell.module.css";

/** NUOVO: dal gestionale si torna al sito di Taglendo (logo su computer, voce del menu su telefono). */
const HOME_LABEL = "Sito di Taglendo";

type Item = { href: string; label: string; icon: (size?: number) => ReactNode; ownerOnly?: boolean };

/** Ordine della barra laterale su desktop. */
const RAIL: Item[] = [
  { href: "/agenda", label: "Agenda", icon: (s) => <CalendarIcon size={s} /> },
  { href: "/clienti", label: "Clienti", icon: (s) => <UsersIcon size={s} /> },
  { href: "/salone", label: "Salone", icon: (s) => <StoreIcon size={s} /> },
  { href: "/listino", label: "Listino e orari", icon: (s) => <ScissorsIcon size={s} /> },
  { href: "/statistiche", label: "Statistiche", icon: (s) => <StatsIcon size={s} />, ownerOnly: true },
];

/** Ordine del menu a pannello su telefono. */
const MENU: Item[] = [
  { href: "/agenda", label: "Agenda", icon: (s) => <CalendarIcon size={s} /> },
  { href: "/clienti", label: "Clienti", icon: (s) => <UsersIcon size={s} /> },
  { href: "/statistiche", label: "Statistiche", icon: (s) => <StatsIcon size={s} />, ownerOnly: true },
  { href: "/listino", label: "Listino e orari", icon: (s) => <ScissorsIcon size={s} /> },
  { href: "/salone", label: "Salone", icon: (s) => <StoreIcon size={s} /> },
  { href: "/notifiche", label: "Notifiche", icon: (s) => <BellNavIcon size={s} /> },
  { href: "/impostazioni", label: "Impostazioni", icon: (s) => <SettingsRaysIcon size={s} /> },
];

/** Nome della sezione nella testata del telefono. */
const TITLES: [string, string][] = [
  ["/agenda", "Agenda"],
  ["/clienti", "Clienti"],
  ["/statistiche", "Statistiche"],
  ["/listino", "Listino e orari"],
  ["/salone", "Salone"],
  ["/notifiche", "Notifiche"],
  ["/impostazioni", "Impostazioni"],
  ["/profilo", "Profilo"],
];

type Props = {
  salonName: string;
  /** Indirizzo completo della pagina del salone, da copiare. */
  bookingUrl: string;
  userName: string;
  userInitials: string;
  /** Statistiche e il resto del titolare: il barbiere non li vede. */
  isOwner: boolean;
  /** NUOVO: notifiche non lette (campanella). */
  unread: number;
  children: ReactNode;
};

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const firstName = (name: string) => name.split(" ")[0] ?? name;

/**
 * Su desktop barra laterale sempre chiusa a icone (76 px), con le etichette al passaggio del mouse.
 * Su telefono nessuna barra in basso: testata fissa con il nome della sezione e «Menu»,
 * che apre un pannello da destra con le sezioni, il profilo e «Esci».
 */
export function AppShell({ salonName, bookingUrl, userName, userInitials, isOwner, unread, children }: Props) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [copied, setCopied] = useState(false);
  // il menu è «aperto» solo sulla pagina in cui l'hai aperto: cambiando pagina si chiude da solo
  const [openAt, setOpenAt] = useState<string | null>(null);
  const menuOpen = openAt === pathname;
  const timer = useRef<number | undefined>(undefined);
  const menuRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
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

  const closeMenu = useCallback(() => {
    setOpenAt(null);
    openerRef.current?.focus();
  }, []);

  // aperto: il cursore va sul pulsante di chiusura, Esc chiude e la tastiera resta dentro il pannello
  useEffect(() => {
    if (!menuOpen) return;
    closeRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !menuRef.current) return;
    const focusable = [...menuRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const settingsActive = isCurrent(pathname, "/impostazioni");
  const rail = RAIL.filter((i) => !i.ownerOnly || isOwner);
  const menu = MENU.filter((i) => !i.ownerOnly || isOwner);
  const title = TITLES.find(([href]) => isCurrent(pathname, href))?.[1] ?? "";
  const day = search.get("g");
  const otherDay = pathname === "/agenda" && !!day && day !== romeDate(new Date());

  return (
    <div className={styles.shell} data-app-shell>
      <nav className={styles.rail} aria-label="Menu principale">
        <Link href="/" className={styles.logo} data-label={HOME_LABEL} aria-label={HOME_LABEL}>
          <Image src="/brand/taglendo-icon.svg" alt="" width={36} height={36} className={styles.logoImage} />
        </Link>
        <div className={styles.group}>
          {rail.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(styles.railItem, isCurrent(pathname, item.href) && styles.railItemActive)}
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              aria-label={item.label}
              data-label={item.label}
              data-tour={item.href === "/clienti" ? "clients" : item.href === "/salone" ? "salon" : undefined}
            >
              {item.icon(22)}
            </Link>
          ))}
        </div>
        <div className={cx(styles.group, styles.groupBottom)}>
          <Link
            href="/notifiche"
            className={cx(styles.railItem, isCurrent(pathname, "/notifiche") && styles.railItemActive)}
            aria-current={isCurrent(pathname, "/notifiche") ? "page" : undefined}
            aria-label={unread ? `Notifiche, ${unread} nuove` : "Notifiche"}
            data-label="Notifiche"
          >
            <BellNavIcon />
            {unread ? <span className={styles.badge}>{unread > 9 ? "9+" : unread}</span> : null}
          </Link>
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
          <Link href="/profilo" className={styles.railItem} aria-label={`${userInitials}, profilo di ${userName}`} data-label={userName}>
            <span className={styles.avatar}>{userInitials}</span>
          </Link>
          <form action={signOut} onSubmit={clearOfflineData}>
            <button type="submit" className={styles.railItem} aria-label="Esci" data-label="Esci">
              <LogoutIcon />
            </button>
          </form>
        </div>
      </nav>

      <header className={styles.mobileBar}>
        <Link className={styles.mbBrand} href="/agenda" aria-label="Taglendo, vai all’agenda">
          <Image src="/brand/taglendo-icon.svg" alt="" width={32} height={32} />
        </Link>
        <p className={styles.mbTitle}>{title}</p>
        <span className={styles.mbActions}>
          {otherDay && (
            <Link className={styles.mbToday} href="/agenda">
              Oggi
            </Link>
          )}
          <Link href="/notifiche" className={styles.mbBell} aria-label={unread ? `Notifiche, ${unread} nuove` : "Notifiche"}>
            <BellNavIcon />
            {unread ? <span className={styles.badge}>{unread > 9 ? "9+" : unread}</span> : null}
          </Link>
          <button ref={openerRef} type="button" data-tour="menu" className={styles.mbMenu} aria-controls="app-menu" aria-expanded={menuOpen} onClick={() => setOpenAt(pathname)}>
            <MenuIcon />
            <span>Menu</span>
          </button>
        </span>
      </header>

      <div className={styles.content}>
        <OfflineSync />
        {children}
      </div>
      <SessionGuard />
      <SwRegister />

      {menuOpen && <div className={styles.menuVeil} onClick={closeMenu} aria-hidden="true" />}
      <div
        ref={menuRef}
        className={cx(styles.menu, styles.menuDrawer)}
        id="app-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!menuOpen}
        onKeyDown={trapTab}
      >
        <div className={styles.drawerHead}>
          <Link className={styles.drawerProfile} href="/profilo">
            <span className={styles.drawerAvatar}>{userInitials}</span>
            <span className={styles.drawerWho}>
              <span className={styles.drawerName}>{firstName(userName)}</span>
              <span className={styles.drawerRole}>
                {isOwner ? "Titolare" : "Barbiere"} · {salonName}
              </span>
            </span>
          </Link>
          <button ref={closeRef} type="button" className={styles.drawerClose} aria-label="Chiudi il menu" onClick={closeMenu}>
            <CloseIcon />
          </button>
        </div>
        <nav className={styles.menuNav} aria-label="Sezioni">
          {menu.map((item) => {
            const active = isCurrent(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={cx(styles.menuLink, active && styles.menuLinkOn)} aria-current={active ? "page" : undefined}>
                <span className={styles.menuLinkIcon} aria-hidden="true">
                  {item.icon(20)}
                </span>
                <span className={styles.menuLinkText}>{item.label}</span>
                {active && (
                  <span className={styles.menuCheck} aria-hidden="true">
                    <CheckMarkIcon />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className={styles.menuFoot}>
          <Link href="/" className={styles.menuLink}>
            <span className={styles.menuLinkIcon} aria-hidden="true">
              <HomeIcon />
            </span>
            <span className={styles.menuLinkText}>{HOME_LABEL}</span>
          </Link>
          <button type="button" className={styles.menuLink} onClick={copy}>
            <span className={styles.menuLinkIcon} aria-hidden="true">
              <CopyIcon />
            </span>
            <span className={styles.menuLinkText}>{copied ? "Link copiato" : "Copia il link di prenotazione"}</span>
          </button>
          <form action={signOut} onSubmit={clearOfflineData}>
            <button type="submit" className={cx(styles.menuLink, styles.menuLogout)}>
              <span className={styles.menuLinkIcon} aria-hidden="true">
                <LogoutMenuIcon />
              </span>
              Esci
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
