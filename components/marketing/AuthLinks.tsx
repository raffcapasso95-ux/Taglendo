import Link from "next/link";
import { getUser } from "@/lib/auth/session";
import { marketingCopy as copy } from "@/lib/copy/marketing";
import styles from "./Marketing.module.css";

/** Chi ha già una sessione trova "Vai all'agenda"; gli altri "Accedi" e "Prova gratis". */
export async function AuthLinks() {
  const user = await getUser();
  if (user) {
    return (
      <Link href="/agenda" className={styles.button}>
        {copy.nav.toApp}
      </Link>
    );
  }
  return <GuestLinks />;
}

export function GuestLinks() {
  return (
    <>
      <Link href="/accedi" className={styles.ghost}>{copy.nav.signIn}</Link>
      <Link href="/registrati" className={styles.button}>{copy.nav.try}</Link>
    </>
  );
}
