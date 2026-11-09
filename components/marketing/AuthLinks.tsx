import Link from "next/link";
import { getMembership, getUser } from "@/lib/auth/session";
import { marketingCopy as copy } from "@/lib/copy/marketing";
import { initials } from "@/lib/rules/agenda";
import { AccountMenu, type AccountInfo } from "./AccountMenu";
import styles from "./Marketing.module.css";

/** Chi ha una sessione: nome, iniziali e salone per il menu della testata. Null per gli ospiti. */
export async function getAccount(): Promise<AccountInfo | null> {
  const user = await getUser();
  if (!user) return null;
  const membership = await getMembership();
  const metaName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  const name = membership?.name || metaName || user.email || "";
  return { name, initials: initials(name), salonName: membership?.salon.name ?? null, isOwner: membership?.role === "owner" };
}

/** Chi ha già una sessione trova il tondo con le sue iniziali e il menu; gli altri "Accedi" e "Prova gratis". */
export async function AuthLinks() {
  const account = await getAccount();
  if (account) return <AccountMenu account={account} tone="light" />;
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
