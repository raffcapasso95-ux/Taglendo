import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { adminSignOut } from "@/lib/admin/actions";
import { adminCopy } from "@/lib/copy/admin";
import { AdminNav } from "./AdminNav";
import styles from "./Admin.module.css";

/** La cornice del gestionale: barra con le voci, l'email di chi è dentro e «Esci». */
export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.barIn}>
          <Link href="/admin" className={styles.brand}>
            <Image src="/brand/taglendo-icon.svg" alt="" width={28} height={28} />
            Taglendo <small>Gestionale</small>
          </Link>
          <Suspense fallback={<div className={styles.nav} />}>
            <AdminNav />
          </Suspense>
          <form action={adminSignOut} className={styles.who}>
            <span className={styles.whoMail}>{email}</span>
            <button type="submit" className={styles.out}>
              {adminCopy.nav.out}
            </button>
          </form>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
