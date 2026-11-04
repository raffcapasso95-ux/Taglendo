import "server-only";

export type Mail = { to: string; subject: string; html: string; text: string; fromName: string };
export type SendResult = { ok: true } | { ok: false; error: string };

/** "Taglendo <ciao@taglendo.it>" → "ciao@taglendo.it" */
const addressOf = (from: string) => from.match(/<([^>]+)>/)?.[1] ?? from.trim();

/**
 * L'unico punto da cui partono le email. Online usa Resend; in locale (senza chiave) passa da Mailpit,
 * la casella di prova di Supabase (http://127.0.0.1:54324).
 */
export async function sendEmail(mail: Mail): Promise<SendResult> {
  const address = addressOf(process.env.EMAIL_FROM ?? "prenotazioni@taglendo.example");
  const from = `${mail.fromName.replace(/["<>]/g, "")} <${address}>`;
  const key = process.env.RESEND_API_KEY;
  try {
    if (key) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
      });
      if (!res.ok) return { ok: false, error: `Resend ${res.status}` };
      return { ok: true };
    }
    if (process.env.NODE_ENV === "production") return { ok: false, error: "RESEND_API_KEY mancante" };
    const res = await fetch(`${process.env.MAILPIT_URL ?? "http://127.0.0.1:54324"}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: { Email: address, Name: mail.fromName },
        To: [{ Email: mail.to }],
        Subject: mail.subject,
        HTML: mail.html,
        Text: mail.text,
      }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Mailpit ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "invio non riuscito" };
  }
}
