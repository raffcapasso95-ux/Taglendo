import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ManageView } from "@/components/salon/ManageView";
import styles from "@/components/salon/Manage.module.css";
import { loadManage } from "@/lib/booking/manage";
import { manageCopy } from "@/lib/copy/manage";
import { formatPrice } from "@/lib/dates/format";
import { longDay } from "@/lib/dates/rome";
import { romeDate } from "@/lib/dates/rome";
import { span } from "@/lib/rules/agenda";
import { cancelLimitText, whenLong } from "@/lib/rules/emailText";
import { formatMinutes } from "@/lib/rules/hours";
import { mapsHref, phoneHref, typicalHoursLine } from "@/lib/rules/publicPage";

export const metadata: Metadata = { title: "La tua prenotazione · Taglendo", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#3E2532" };

function Invalid({ slug }: { slug: string }) {
  return (
    <div className={styles.page}>
      <main className={styles.wrap}>
        <div className={styles.card}>
          <h1 className={styles.title}>{manageCopy.invalidTitle}</h1>
          <p className={styles.text}>{manageCopy.invalidText}</p>
          <div className={styles.actions}>
            <Link href={`/${slug}`} className={styles.primary}>{manageCopy.toSalon}</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

async function Content({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  await connection(); // "troppo tardi" dipende dall'ora
  const m = await loadManage(token);
  const now = new Date().getTime();
  // Link inesistente, di un altro salone, già annullato, completato o passato: E5.
  if (!m || m.salon.slug.toLowerCase() !== slug.toLowerCase() || m.status !== "confermato" || new Date(m.startsAt).getTime() <= now) return <Invalid slug={slug} />;

  const starts = new Date(m.startsAt);
  const canCancel = m.salon.cancelOnline && now <= starts.getTime() - m.salon.cancelLimitMin * 60000;
  const withWho = m.multiple && m.memberName ? ` con ${m.memberName}` : "";
  const detail = `${m.serviceName}${m.durationMin ? ` · ${span(m.durationMin)}` : ""}${withWho}`;
  const base = `/${m.salon.slug}/prenotazione/${token}`;

  return (
    <ManageView
      slug={m.salon.slug}
      token={token}
      salonName={m.salon.name}
      area={m.salon.area}
      address={m.salon.address}
      phone={m.salon.phone}
      telHref={phoneHref(m.salon.phone)}
      mapsHref={mapsHref(m.salon.address, m.salon.area)}
      dayLong={longDay(romeDate(starts))}
      at={`alle ${formatMinutes(m.startMin)}`}
      detail={detail}
      price={m.salon.showPrices ? formatPrice(m.priceCents) : null}
      code={m.publicCode}
      calendarHref={`${base}/calendario.ics`}
      cancelUntil={m.salon.cancelOnline ? cancelLimitText(starts, m.salon.cancelLimitMin) : null}
      canCancel={canCancel}
      cancelOnline={m.salon.cancelOnline}
      limitLabel={m.salon.cancelLimitMin >= 1440 ? "24 ore" : "2 ore"}
      hoursLine={typicalHoursLine(m.salon.week)}
      when={whenLong(m.date, m.startMin)}
      withWho={withWho}
    />
  );
}

export default function Page(props: PageProps<"/[slug]/prenotazione/[token]">) {
  return (
    <Suspense fallback={null}>
      <Content params={props.params} />
    </Suspense>
  );
}
