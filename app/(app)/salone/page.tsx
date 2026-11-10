import type { Metadata } from "next";
import { Suspense } from "react";
import { ScissorsIcon, UsersIcon } from "@/components/app/Icons";
import { LinkView } from "@/components/link/LinkView";
import { SettingsGroup, type SettingsRow } from "@/components/settings/SettingsGroup";
import { MailIcon, PageIcon, RulesIcon } from "@/components/settings/SettingsIcons";
import settings from "@/components/settings/Settings.module.css";
import { CardsSkeleton } from "@/components/states/Skeletons";
import { requireSalon } from "@/lib/auth/session";
import { listinoCopy } from "@/lib/copy/listino";
import { ONLINE_BOOKING_READY } from "@/lib/features";
import { reminderLabel } from "@/lib/rules/reminders";
import { env } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Salone · Taglendo" };

const copy = listinoCopy.settings;
const salonCopy = listinoCopy.salon;

/** La sezione «Salone»: il link di prenotazione e, per il titolare, tutte le impostazioni del salone. */
async function Content() {
  const { role, salon } = await requireSalon();
  const owner = role === "owner";
  const supabase = await createClient();

  let rows: SettingsRow[] = [];
  let ownerName = "";
  if (owner) {
    const { data: prefs } = await supabase.from("email_prefs").select("reminder, reminder_hours").eq("salon_id", salon.id).maybeSingle();
    const reminderOn = prefs?.reminder ?? true;
    rows = [
      { href: "/impostazioni/pagina", label: copy.rows.page, sub: copy.rowSub.page, tone: 3, icon: <PageIcon /> },
      { href: "/listino", label: copy.rows.listino, sub: copy.rowSub.listino, tone: 0, icon: <ScissorsIcon /> },
      { href: "/impostazioni/operatori", label: copy.rows.operators, sub: copy.operatorsSub, tone: 1, icon: <UsersIcon /> },
      { href: "/impostazioni/regole", label: copy.rows.rules, sub: copy.rowSub.rules, tone: 2, icon: <RulesIcon /> },
      {
        href: "/impostazioni/email",
        label: copy.rows.emails,
        sub: reminderOn ? salonCopy.remindersSub(reminderLabel(prefs?.reminder_hours ?? 24)) : copy.rowSub.emails,
        tone: 1,
        icon: <MailIcon />,
      },
    ];
  } else {
    const { data } = await supabase.from("members").select("name").eq("salon_id", salon.id).eq("role", "owner").limit(1).maybeSingle();
    ownerName = data?.name ?? "";
  }

  return (
    <LinkView
      salonName={salon.name}
      url={`${env.siteUrl()}/${salon.slug}`}
      prices={salon.show_prices}
      bookingOnline={ONLINE_BOOKING_READY && salon.booking_online}
      cancelLabel={salon.cancel_online ? (salon.cancel_limit_min >= 1440 ? "Fino a 24 ore prima" : "Fino a 2 ore prima") : "Solo telefono"}
      isOwner={owner}
    >
      {owner ? (
        <SettingsGroup id="sal-impostazioni" title={salonCopy.settingsTitle} rows={rows} />
      ) : (
        <p className={settings.sub}>{salonCopy.askOwner(ownerName)}</p>
      )}
    </LinkView>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<CardsSkeleton />}>
      <Content />
    </Suspense>
  );
}
