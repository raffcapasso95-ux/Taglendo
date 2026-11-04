import { Text } from "@react-email/components";
import { emailCopy } from "@/lib/copy/emails";
import { mail } from "../theme";
import { Layout } from "./Layout";

export type CodeEmailProps = { salonName: string; code: string; footer: string; siteUrl: string };

/** F1 · Codice di conferma. */
export function CodeEmail({ salonName, code, footer, siteUrl }: CodeEmailProps) {
  const copy = emailCopy.code;
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return (
    <Layout salonName={salonName} footer={footer} siteUrl={siteUrl}>
      <Text style={{ margin: "0 0 16px", fontSize: 24, lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.03em" }}>{copy.title}</Text>
      <Text style={{ margin: "0 0 16px", padding: 16, borderRadius: 12, background: mail.muted, fontSize: 36, fontWeight: 700, letterSpacing: "0.2em", textAlign: "center" }}>{spaced}</Text>
      <Text style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.5, color: mail.secondary }}>{copy.body}</Text>
      <Text style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: mail.secondary }}>{copy.ignore}</Text>
    </Layout>
  );
}
