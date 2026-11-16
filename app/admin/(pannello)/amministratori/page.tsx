import { connection } from "next/server";
import { Suspense } from "react";
import { AddAdmin } from "@/components/admin/AddAdmin";
import { AdminRowMenu } from "@/components/admin/AdminRowMenu";
import { agoLabel, dateLabel } from "@/components/admin/format";
import { Icon } from "@/components/admin/Icons";
import styles from "@/components/admin/Admin.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { loadAdmins } from "@/lib/admin/load";
import { adminCopy } from "@/lib/copy/admin";

const copy = adminCopy.admins;

async function Content() {
  await connection();
  const admins = await loadAdmins();
  if (!admins) return <p className={styles.notice}>{adminCopy.errors.load}</p>;
  return (
    <>
      <p className={styles.label} role="status">
        {copy.count(admins.length)}
      </p>
      {admins.length === 0 ? (
        <p className={`${styles.tableWrap} ${styles.empty}`}>{copy.none}</p>
      ) : (
        <ul className={styles.gridCards}>
          {admins.map((a) => {
            const name = a.name ?? a.email.split("@")[0]!;
            return (
              <li key={a.user_id}>
                <article className={styles.sCard}>
                  <div className={styles.sCardHead}>
                    <span className={styles.nameCell}>
                      <Avatar name={name} size="md" />
                      <span className={styles.nameText}>
                        <strong>{name}</strong>
                        <span className={styles.sub}>{a.email}</span>
                      </span>
                    </span>
                    {a.self ? <span className={`${styles.badge} ${styles.bOk}`}>{copy.you}</span> : null}
                  </div>
                  <span className={styles.badges}>
                    <span className={styles.badge}>
                      <Icon name="shield" size={13} />
                      {copy.role}
                    </span>
                    {a.blocked ? <span className={`${styles.badge} ${styles.bBad}`}>{adminCopy.users.badges.blocked}</span> : null}
                  </span>
                  <dl className={styles.sCardFacts}>
                    <div>
                      <dt>{copy.lastAccess}</dt>
                      <dd>{a.last_sign_in_at ? agoLabel(a.last_sign_in_at) : adminCopy.users.never}</dd>
                    </div>
                    <div>
                      <dt>{copy.addedOn}</dt>
                      <dd>{dateLabel(a.added_at)}</dd>
                    </div>
                  </dl>
                  {a.self ? null : <AdminRowMenu userId={a.user_id} email={a.email} name={name} />}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function Page() {
  return (
    <>
      <div className={`${styles.head} ${styles.headRow}`}>
        <div>
          <h1>{copy.title}</h1>
          <p className={styles.lead}>{copy.lead}</p>
        </div>
        <AddAdmin />
      </div>
      <Suspense fallback={<p className={styles.lead}>…</p>}>
        <Content />
      </Suspense>
    </>
  );
}
