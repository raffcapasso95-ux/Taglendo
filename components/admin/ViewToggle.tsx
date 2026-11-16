import Link from "next/link";
import type { View } from "@/lib/admin/load";
import { adminCopy } from "@/lib/copy/admin";
import { Icon } from "./Icons";
import styles from "./Admin.module.css";

/** Tabella o schede: come /cerca, due modi di guardare lo stesso elenco. */
export function ViewToggle({ view, href }: { view: View; href: (v: View) => string }) {
  const c = adminCopy.view;
  return (
    <div className={styles.toggle} role="group" aria-label={c.label}>
      <Link href={href("tabella")} aria-current={view === "tabella" ? "true" : undefined} scroll={false}>
        <Icon name="table" />
        {c.table}
      </Link>
      <Link href={href("schede")} aria-current={view === "schede" ? "true" : undefined} scroll={false}>
        <Icon name="cards" />
        {c.cards}
      </Link>
    </div>
  );
}
