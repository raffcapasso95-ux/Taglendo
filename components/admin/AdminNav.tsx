"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminCopy } from "@/lib/copy/admin";
import styles from "./Admin.module.css";

const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ITEMS = [
  {
    href: "/admin",
    label: adminCopy.nav.overview,
    exact: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
        <rect x="3.5" y="3.5" width="7" height="8" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
        <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
        <rect x="3.5" y="14.5" width="7" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/saloni",
    label: adminCopy.nav.salons,
    exact: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
        <path d="M4 9.5 5.5 4h13L20 9.5" />
        <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
        <path d="M5.5 12.5V20h13v-7.5" />
      </svg>
    ),
  },
  {
    href: "/admin/utenze",
    label: adminCopy.nav.users,
    exact: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
        <circle cx="9" cy="8" r="3.3" />
        <path d="M2.8 20c.4-3.5 3-5.6 6.2-5.6s5.8 2.1 6.2 5.6" />
        <path d="M16 4.9a3.3 3.3 0 0 1 0 6.2M18.2 14.8c1.8.7 3 2.4 3.2 5.2" />
      </svg>
    ),
  },
  {
    href: "/admin/amministratori",
    label: adminCopy.nav.admins,
    exact: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...ICON}>
        <path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.5 7 9 4.2-1.5 7-4.8 7-9V6l-7-2.5Z" />
        <path d="m9 12 2.2 2.2L15.2 10" />
      </svg>
    ),
  },
] as const;

/** Le due voci del gestionale; la pagina in cui si è è segnata. */
export function AdminNav() {
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label={adminCopy.nav.label}>
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} className={styles.navLink} aria-current={(i.exact ? path === i.href : path.startsWith(i.href)) ? "page" : undefined}>
          {i.icon}
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
