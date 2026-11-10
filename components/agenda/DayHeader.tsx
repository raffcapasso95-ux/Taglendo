import Image from "next/image";
import Link from "next/link";
import { initials } from "@/lib/rules/agenda";
import { HeaderActions } from "./HeaderActions";
import styles from "./Agenda.module.css";

type Props = {
  salonName: string;
  salonLogo: string | null;
  userInitials: string;
  greeting: string;
  longDate: string;
  summary: string;
  showToday: boolean;
};

/** Intestazione: sul telefono logo, "Oggi" e profilo; su desktop solo saluto, data e riepilogo. */
export function DayHeader({ salonName, salonLogo, userInitials, greeting, longDate, summary, showToday }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.phoneBar}>
        <div className={styles.brand}>
          <Image src="/brand/taglendo-icon.svg" alt="Taglendo" width={34} height={34} className={styles.brandIcon} />
          <span className={styles.brandName}>{salonName}</span>
        </div>
        <div className={styles.phoneActions}>
          {showToday ? (
            <Link href="/agenda" className={styles.todayButton}>
              Oggi
            </Link>
          ) : null}
          <Link href="/impostazioni" className={styles.profileButton} aria-label={`${userInitials}, impostazioni e profilo`}>
            {userInitials}
          </Link>
        </div>
      </div>
      <div className={styles.titleRow}>
        <div className={styles.titles}>
          {/* NUOVO: il salone, sempre in vista (logo o iniziali e nome) */}
          <Link href="/salone" className={styles.salonBadge}>
            {salonLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={salonLogo} alt="" width={32} height={32} className={styles.salonLogo} />
            ) : (
              <span className={styles.salonInitials} aria-hidden="true">
                {initials(salonName)}
              </span>
            )}
            <span className={styles.salonName}>{salonName}</span>
          </Link>
          <p className={styles.greeting}>{greeting}</p>
          <h1 className={styles.date}>{longDate}</h1>
          {summary ? <p className={styles.summary}>{summary}</p> : null}
        </div>
        <HeaderActions />
      </div>
    </header>
  );
}
