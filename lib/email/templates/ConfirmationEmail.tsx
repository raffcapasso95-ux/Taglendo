import { Button, Link, Preview, Section, Text } from "@react-email/components";
import { emailCopy } from "@/lib/copy/emails";
import { mail } from "../theme";
import { Layout } from "./Layout";

export type ConfirmationEmailProps = {
  salonName: string;
  firstName: string;
  weekday: string; // "venerdì"
  /** NUOVO: "oggi" e "domani" cambiano il saluto («Ci vediamo oggi, Luca!»). */
  day?: "oggi" | "domani" | "altro";
  when: string; // "Ven 30 ottobre, 10:30"
  service: string; // "Taglio e barba · 50 min"
  barber: string | null; // solo con più barbieri
  price: string | null; // "30 €", null se i prezzi sono nascosti
  address: string | null;
  manageUrl: string;
  calendarUrl: string;
  /** "venerdì alle 8:30"; null se l'annullamento online è spento */
  cancelUntil: string | null;
  phone: string;
  footer: string;
  siteUrl: string;
  /** NUOVO: logo del salone in alto, se c'è. */
  logoUrl?: string | null;
};

const row = (label: string, value: React.ReactNode, last = false) => (
  <Section key={label} style={{ padding: "12px 0", borderBottom: last ? "none" : `1px solid ${mail.line}` }}>
    <Text style={{ margin: 0, fontSize: 13, color: mail.secondary }}>{label}</Text>
    <Text style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: mail.plum }}>{value}</Text>
  </Section>
);

/** "Ven 30 ottobre, 10:30" → ["Ven 30 ottobre", "10:30"]. */
function splitWhen(when: string): [string, string] {
  const i = when.lastIndexOf(", ");
  return i > 0 ? [when.slice(0, i), when.slice(i + 2)] : [when, ""];
}

export const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** F2 · Prenotazione confermata: conferma in evidenza, giorno e ora grandi, dettagli, azioni. */
export function ConfirmationEmail(p: ConfirmationEmailProps) {
  const copy = emailCopy.confirmed;
  const [date, time] = splitWhen(p.when);
  const tel = p.phone.replace(/[^\d+]/g, "");
  const details = [
    { label: copy.service, value: p.service },
    ...(p.barber ? [{ label: copy.barber, value: p.barber }] : []),
    ...(p.price ? [{ label: copy.price, value: `${p.price} ${copy.inShop}` }] : []),
    ...(p.address
      ? [
          {
            label: copy.where,
            value: (
              <Link href={mapsUrl(p.address)} style={{ color: mail.plum, textDecoration: "underline" }}>
                {p.address}
              </Link>
            ),
          },
        ]
      : []),
  ];

  return (
    <Layout salonName={p.salonName} footer={p.footer} siteUrl={p.siteUrl} logoUrl={p.logoUrl}>
      <Preview>{copy.preview(p.salonName, p.when)}</Preview>
      <Text style={{ display: "inline-block", margin: "0 0 12px", padding: "4px 10px", borderRadius: 999, background: mail.successBg, color: mail.success, fontSize: 13, fontWeight: 700 }}>
        ✓ {copy.badge}
      </Text>
      <Text style={{ margin: "0 0 18px", fontSize: 24, lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.03em" }}>{copy.title(p.weekday, p.firstName, p.day)}</Text>

      <Section style={{ padding: "16px 18px", borderRadius: 14, background: mail.peach }}>
        <Text style={{ margin: 0, fontSize: 13, fontWeight: 700, color: mail.plum, textTransform: "uppercase", letterSpacing: "0.06em" }}>{copy.when}</Text>
        <Text style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: mail.plum }}>{date}</Text>
        {time ? <Text style={{ margin: 0, fontSize: 30, lineHeight: 1.15, fontWeight: 700, color: mail.plum, letterSpacing: "-0.02em" }}>{time}</Text> : null}
      </Section>

      <Section style={{ padding: "6px 0 0" }}>{details.map((d, i) => row(d.label, d.value, i === details.length - 1))}</Section>

      <Section style={{ padding: "18px 0 0" }}>
        <Button href={p.manageUrl} style={{ display: "block", textAlign: "center", padding: "14px 20px", borderRadius: 999, background: mail.plum, color: mail.cream, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
          {copy.manage}
        </Button>
      </Section>
      <Section style={{ padding: "10px 0 0" }}>
        <Button href={p.calendarUrl} style={{ display: "block", textAlign: "center", padding: "12px 20px", borderRadius: 999, border: `1px solid ${mail.lineStrong}`, color: mail.plum, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
          {copy.calendar}
        </Button>
      </Section>

      <Text style={{ margin: "18px 0 0", fontSize: 14, lineHeight: 1.5, color: mail.secondary }}>
        {p.cancelUntil ? copy.cancelFree(p.cancelUntil, p.phone) : copy.phoneOnly(p.phone)}
      </Text>
      {tel ? (
        <Text style={{ margin: "8px 0 0", fontSize: 14 }}>
          <Link href={`tel:${tel}`} style={{ color: mail.plum, fontWeight: 700 }}>
            {copy.call(p.phone)}
          </Link>
        </Text>
      ) : null}
    </Layout>
  );
}
