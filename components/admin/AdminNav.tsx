"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminCopy } from "@/lib/copy/admin";
import styles from "./Admin.module.css";

const ITEMS = [
  { href: "/admin", label: adminCopy.nav.overview, exact: true },
  { href: "/admin/saloni", label: adminCopy.nav.salons, exact: false },
] as const;

/** Le due voci del gestionale; la pagina in cui si è è segnata. */
export function AdminNav() {
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label={adminCopy.nav.label}>
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} className={styles.navLink} aria-current={(i.exact ? path === i.href : path.startsWith(i.href)) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
