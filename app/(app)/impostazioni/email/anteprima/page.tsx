import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import styles from "@/components/listino/Listino.module.css";
import rules from "@/components/settings/Rules.module.css";
import { requireSalon } from "@/lib/auth/session";
import { emailPrefsCopy as copy } from "@/lib/copy/notify";
import { buildCancellationEmail, buildCodeEmail, buildConfirmationEmail, buildMovedEmail, buildReminderEmail } from "@/lib/email/render";

export const metadata: Metadata = { title: "Anteprime delle email · Taglendo", robots: { index: false } };

async function Content() {
  const { role, salon } = await requireSalon();
  if (role !== "owner") redirect("/agenda");
  const footer = [salon.name, salon.address, salon.phone].filter(Boolean).join(" · ");
  const phone = salon.phone ?? "";
  const manageUrl = `/${salon.slug}/prenotazione/esempio`;
  const [code, confirmed, reminder, cancelled, moved] = await Promise.all([
    buildCodeEmail({ salonName: salon.name, code: "482913", footer }),
    buildConfirmationEmail({ salonName: salon.name, firstName: "Luca", weekday: "venerdì", when: "Ven 30 ottobre, 10:30", subjectWhen: "venerdì 30 ottobre alle 10:30", service: "Taglio e barba · 50 min", barber: null, price: salon.show_prices ? "30 €" : null, address: salon.address, manageUrl, calendarUrl: manageUrl, cancelUntil: salon.cancel_online ? "venerdì alle 8:30" : null, phone, footer }),
    buildReminderEmail({ salonName: salon.name, firstName: "Luca", at: "10:30", when: "Ven 30 ottobre, 10:30", service: "Taglio e barba", manageUrl, cancelUntil: salon.cancel_online ? "domani alle 8:30" : null, phone, footer }),
    buildCancellationEmail({ salonName: salon.name, by: "cliente", when: "venerdì 30 ottobre alle 10:30", bookUrl: `/${salon.slug}#prenota`, phone, footer }),
    buildMovedEmail({ salonName: salon.name, before: "Ven 30 ottobre, 10:30", after: "Ven 30 ottobre, 11:30", afterLong: "venerdì 30 ottobre alle 11:30", service: "Taglio e barba", manageUrl, phone, footer }),
  ]);
  const items = [
    { key: "code", name: copy.previewNames.code, mail: code },
    { key: "confirmed", name: copy.previewNames.confirmed, mail: confirmed },
    { key: "reminder", name: copy.previewNames.reminder, mail: reminder },
    { key: "cancelled", name: copy.previewNames.cancelled, mail: cancelled },
    { key: "moved", name: copy.previewNames.moved, mail: moved },
  ];
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <Link href="/impostazioni/email" className={rules.back}>‹ {copy.title}</Link>
        <h1 className={styles.title}>{copy.previewTitle}</h1>
      </header>
      <p className={styles.note}>{copy.previewIntro}</p>
      {items.map((i) => (
        <section key={i.key} className={styles.section} aria-label={i.name}>
          <h2 className={styles.sectionTitle}>{i.name}</h2>
          <p className={styles.note}>Oggetto: <strong>{i.mail.subject}</strong></p>
          <iframe title={i.name} srcDoc={i.mail.html} sandbox="" style={{ width: "100%", height: 520, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-card)", background: "var(--surface)" }} />
        </section>
      ))}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
