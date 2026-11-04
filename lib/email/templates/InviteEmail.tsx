import { Button, Text } from "@react-email/components";
import { inviteEmailCopy as copy } from "@/lib/copy/emails";
import { mail } from "../theme";
import { Layout } from "./Layout";

export type InviteEmailProps = { salonName: string; name: string; ownerFull: string; chair: number; acceptUrl: string; footer: string; siteUrl: string };

/** F5 · Invito a un operatore. */
export function InviteEmail(p: InviteEmailProps) {
  return (
    <Layout salonName={p.salonName} footer={p.footer} siteUrl={p.siteUrl}>
      <Text style={{ margin: "0 0 12px", fontSize: 24, lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.03em" }}>{copy.title(p.name)}</Text>
      <Text style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.5, color: mail.secondary }}>{copy.body(p.ownerFull, p.chair)}</Text>
      <Button href={p.acceptUrl} style={{ display: "block", textAlign: "center", padding: "14px 20px", borderRadius: 12, background: mail.plum, color: mail.cream, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
        {copy.accept}
      </Button>
      <Text style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.5, color: mail.secondary }}>{copy.note}</Text>
    </Layout>
  );
}
