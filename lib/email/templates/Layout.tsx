import { Body, Container, Head, Html, Img, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { mail } from "../theme";

type Props = { preview?: string; salonName: string; footer: string; children: ReactNode; siteUrl: string };

/** Cornice comune a tutte le email: nome del salone in alto, contatti e "Prenotazioni con Taglendo" in fondo. */
export function Layout({ salonName, footer, siteUrl, children }: Props) {
  return (
    <Html lang="it">
      <Head />
      <Body style={{ margin: 0, padding: "24px 12px", background: mail.cream, fontFamily: mail.font, color: mail.plum }}>
        <Container style={{ maxWidth: 480, background: mail.surface, border: `1px solid ${mail.line}`, borderRadius: 16, overflow: "hidden" }}>
          <Section style={{ padding: "28px 28px 24px" }}>
            <Text style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: mail.secondary }}>{salonName}</Text>
            {children}
          </Section>
          <Section style={{ padding: "16px 28px 20px", borderTop: `1px solid ${mail.line}` }}>
            <Text style={{ margin: "0 0 8px", fontSize: 12, color: mail.secondary }}>{footer}</Text>
            <Text style={{ margin: 0, fontSize: 12, color: mail.secondary }}>
              Prenotazioni con <Img src={`${siteUrl}/brand/taglendo-logo.svg`} alt="Taglendo" width={72} style={{ display: "inline-block", verticalAlign: "middle" }} />
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
