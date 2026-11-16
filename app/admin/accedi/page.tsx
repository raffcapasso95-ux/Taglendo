import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminSignIn } from "@/components/admin/AdminSignIn";
import styles from "@/components/admin/Admin.module.css";
import { getAdmin } from "@/lib/admin/session";
import { adminCopy } from "@/lib/copy/admin";

async function Gate() {
  // già dentro come amministratore: si va al gestionale
  if (await getAdmin()) redirect("/admin");
  return <AdminSignIn />;
}

export default function Page() {
  return (
    <main className={styles.login}>
      <div className={styles.loginCard}>
        <Image src="/brand/taglendo-logo.svg" alt="Taglendo" width={120} height={28} style={{ height: 28, width: "auto" }} priority />
        <h1>{adminCopy.signIn.title}</h1>
        <p className={styles.lead}>{adminCopy.signIn.lead}</p>
        <Suspense fallback={null}>
          <Gate />
        </Suspense>
      </div>
    </main>
  );
}
