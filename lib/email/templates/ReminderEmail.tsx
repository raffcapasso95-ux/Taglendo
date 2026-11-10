import { Button, Hr, Section, Text } from "@react-email/components";
import { reminderEmailCopy as copy } from "@/lib/copy/emails";
import { mail } from "../theme";
import { Layout } from "./Layout";

/** day: per quando è l'appuntamento rispetto all'invio; weekday: "giovedì" (serve con "altro"). */
export type ReminderEmailProps = { salonName: string; firstName: string; day?: "oggi" | "domani" | "altro"; weekday?: string; when: string; service: string; manageUrl: string; cancelUntil: string | null; phone: string; footer: string; siteUrl: string };

const row = (label: string, value: string) => (
  <Section key={label} style={{ padding: "10px 0", borderBottom: `1px solid ${mail.line}` }}>
    <Text style={{ margin: 0, fontSize: 13, color: mail.secondary }}>{label}</Text>
    <Text style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{value}</Text>
  </Section>
);

/** F3 · Promemoria. */
export function ReminderEmail(p: ReminderEmailProps) {
  return (
    <Layout salonName={p.salonName} footer={p.footer} siteUrl={p.siteUrl}>
      <Text style={{ margin: "0 0 16px", fontSize: 24, lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.03em" }}>{copy.title(p.firstName, p.day, p.weekday)}</Text>
      <Hr style={{ margin: 0, borderColor: mail.line }} />
      {row(copy.when, p.when)}
      {row(copy.service, p.service)}
      <Section style={{ padding: "20px 0 8px" }}>
        <Button href={p.manageUrl} style={{ display: "block", textAlign: "center", padding: "14px 20px", borderRadius: 12, background: mail.plum, color: mail.cream, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
          {copy.manage}
        </Button>
      </Section>
      <Text style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: mail.secondary }}>{p.cancelUntil ? copy.cancelFree(p.cancelUntil) : copy.phoneOnly(p.phone)}</Text>
    </Layout>
  );
}
