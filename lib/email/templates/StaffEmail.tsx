import { Button, Section, Text } from "@react-email/components";
import { mail } from "../theme";
import { Layout } from "./Layout";

export type StaffEmailProps = { salonName: string; title: string; lines: string[]; ctaLabel: string; ctaUrl: string; footer: string; siteUrl: string };

/** Avvisi al barbiere (nuova prenotazione, annullamento, riepilogo): un titolo, qualche riga e un pulsante. */
export function StaffEmail({ salonName, title, lines, ctaLabel, ctaUrl, footer, siteUrl }: StaffEmailProps) {
  return (
    <Layout salonName={salonName} footer={footer} siteUrl={siteUrl}>
      <Text style={{ margin: "0 0 12px", fontSize: 24, lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.03em" }}>{title}</Text>
      {lines.map((l, i) => (
        <Text key={i} style={{ margin: "0 0 8px", fontSize: 16, lineHeight: 1.5, color: i === 0 ? mail.plum : mail.secondary }}>{l}</Text>
      ))}
      <Section style={{ padding: "12px 0 0" }}>
        <Button href={ctaUrl} style={{ display: "block", textAlign: "center", padding: "14px 20px", borderRadius: 12, background: mail.plum, color: mail.cream, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
          {ctaLabel}
        </Button>
      </Section>
    </Layout>
  );
}
