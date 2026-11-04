import { Button, Hr, Link, Section, Text } from "@react-email/components";
import { emailCopy } from "@/lib/copy/emails";
import { mail } from "../theme";
import { Layout } from "./Layout";

export type ConfirmationEmailProps = {
  salonName: string;
  firstName: string;
  weekday: string; // "venerdì"
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
};

const row = (label: string, value: string) => (
  <Section key={label} style={{ padding: "10px 0", borderBottom: `1px solid ${mail.line}` }}>
    <Text style={{ margin: 0, fontSize: 13, color: mail.secondary }}>{label}</Text>
    <Text style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{value}</Text>
  </Section>
);

/** F2 · Prenotazione confermata. */
export function ConfirmationEmail(p: ConfirmationEmailProps) {
  const copy = emailCopy.confirmed;
  return (
    <Layout salonName={p.salonName} footer={p.footer} siteUrl={p.siteUrl}>
      <Text style={{ margin: "0 0 16px", fontSize: 24, lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.03em" }}>{copy.title(p.weekday, p.firstName)}</Text>
      <Hr style={{ margin: 0, borderColor: mail.line }} />
      {row(copy.when, p.when)}
      {row(copy.service, p.service)}
      {p.barber ? row(copy.barber, p.barber) : null}
      {p.price ? row(copy.price, `${p.price} ${copy.inShop}`) : null}
      {p.address ? row(copy.where, p.address) : null}
      <Section style={{ padding: "20px 0 8px" }}>
        <Button href={p.manageUrl} style={{ display: "block", textAlign: "center", padding: "14px 20px", borderRadius: 12, background: mail.plum, color: mail.cream, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
          {copy.manage}
        </Button>
      </Section>
      <Text style={{ margin: "8px 0 12px", fontSize: 14, lineHeight: 1.5, color: mail.secondary }}>
        {p.cancelUntil ? copy.cancelFree(p.cancelUntil, p.phone) : copy.phoneOnly(p.phone)}
      </Text>
      <Link href={p.calendarUrl} style={{ fontSize: 14, fontWeight: 700, color: mail.plum }}>
        {copy.calendar}
      </Link>
    </Layout>
  );
}
