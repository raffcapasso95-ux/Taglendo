import { Button, Text } from "@react-email/components";
import { cancelEmailCopy as copy } from "@/lib/copy/emails";
import { mail } from "../theme";
import { Layout } from "./Layout";

export type CancellationEmailProps = { salonName: string; by?: "cliente" | "salone"; when: string; bookUrl: string; phone: string; footer: string; siteUrl: string };

/** F4 · Appuntamento annullato. */
export function CancellationEmail({ salonName, by = "cliente", when, bookUrl, phone, footer, siteUrl }: CancellationEmailProps) {
  return (
    <Layout salonName={salonName} footer={footer} siteUrl={siteUrl}>
      <Text style={{ margin: "0 0 12px", fontSize: 24, lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.03em" }}>{copy.title}</Text>
      <Text style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.5, color: mail.secondary }}>{by === "salone" ? copy.bySalon(when) : copy.body(when)}</Text>
      <Button href={bookUrl} style={{ display: "block", textAlign: "center", padding: "14px 20px", borderRadius: 12, background: mail.plum, color: mail.cream, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
        {copy.again}
      </Button>
      <Text style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.5, color: mail.secondary }}>{copy.notYou(phone)}</Text>
    </Layout>
  );
}
