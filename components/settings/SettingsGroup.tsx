import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import settings from "./Settings.module.css";

export type SettingsRow = { href: string; label: string; sub: string; tone: 0 | 1 | 2 | 3; icon: ReactNode };

/** Un gruppo di righe con icona colorata e una riga di spiegazione (Impostazioni e Salone). */
export function SettingsGroup({ id, title, rows }: { id: string; title: string; rows: SettingsRow[] }) {
  return (
    <section className={settings.section} aria-labelledby={id}>
      <h2 className={settings.title} id={id}>
        {title}
      </h2>
      <div className={settings.group}>
        {rows.map((r) => {
          const inner = (
            <>
              <span className={cx(settings.icon, settings[`t${r.tone}` as "t0"])}>{r.icon}</span>
              <span className={settings.text}>
                <span className={settings.label}>{r.label}</span>
                {r.sub ? <span className={settings.sub}>{r.sub}</span> : null}
              </span>
              <span className={settings.chev} aria-hidden="true">
                ›
              </span>
            </>
          );
          return r.href.startsWith("mailto:") ? (
            <a key={r.href} className={settings.row} href={r.href}>
              {inner}
            </a>
          ) : (
            <Link key={r.href} className={settings.row} href={r.href}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
