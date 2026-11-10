import { dayNumber, monthShort, romeDate, romeMinutes, weekdayShort } from "@/lib/dates/rome";
import { formatMinutes } from "@/lib/rules/hours";

/** Una riga di «Notifiche» (tabella activity). */
export type ActivityRow = {
  id: string;
  kind: "nuovo" | "online" | "spostato" | "annullato" | "completato" | "non_presentato";
  by_client: boolean;
  actor_name: string | null;
  actor_member_id: string | null;
  client_name: string | null;
  service_name: string | null;
  member_name: string | null;
  starts_at: string | null;
  old_starts_at: string | null;
  old_member_name: string | null;
  created_at: string;
};

const first = (name: string | null) => (name ?? "").trim().split(/\s+/)[0] ?? "";

/** "gio 12 nov, 10:30" (minuscolo, come nel testo di una frase). */
export function whenText(iso: string, today: string): string {
  const d = new Date(iso);
  const date = romeDate(d);
  const time = formatMinutes(romeMinutes(d));
  if (date === today) return `oggi alle ${time}`;
  return `${weekdayShort(date).toLowerCase()} ${dayNumber(date)} ${monthShort(date)}, ${time}`;
}

/** Titolo e riga di dettaglio di una notifica, in italiano. `multi`: il salone ha più barbieri. */
export function activityText(r: ActivityRow, today: string, multi: boolean): { title: string; detail: string } {
  const client = r.client_name ?? "Cliente";
  const who = r.actor_name ? first(r.actor_name) : null;
  const when = r.starts_at ? whenText(r.starts_at, today) : "";
  const withBarber = multi && r.member_name ? ` con ${first(r.member_name)}` : "";
  const service = r.service_name ? ` · ${r.service_name}` : "";
  switch (r.kind) {
    case "online":
      return { title: "Nuova prenotazione online", detail: `${client}${service} · ${when}${withBarber}` };
    case "nuovo":
      return { title: who ? `${who} ha fissato un appuntamento` : "Nuovo appuntamento", detail: `${client}${service} · ${when}${withBarber}` };
    case "spostato": {
      const from = r.old_starts_at ? whenText(r.old_starts_at, today) : "";
      const barber = multi && r.old_member_name && r.old_member_name !== r.member_name ? ` (ora con ${first(r.member_name)})` : "";
      return { title: who ? `${who} ha spostato un appuntamento` : "Appuntamento spostato", detail: `${client}: da ${from} a ${when}${barber}` };
    }
    case "annullato":
      return { title: r.by_client ? "Annullato dal cliente" : who ? `${who} ha annullato un appuntamento` : "Appuntamento annullato", detail: `${client}${service} · ${when}${withBarber}` };
    case "completato":
      return { title: "Appuntamento completato", detail: `${client}${service} · ${when}${withBarber}${who ? ` · segnato da ${who}` : ""}` };
    case "non_presentato":
      return { title: "Cliente non presentato", detail: `${client}${service} · ${when}${withBarber}` };
  }
}

/** Gruppi per giorno: "Oggi", "Ieri", "Lun 9 nov". */
export function dayGroup(iso: string, today: string, yesterday: string): string {
  const date = romeDate(new Date(iso));
  if (date === today) return "Oggi";
  if (date === yesterday) return "Ieri";
  return `${weekdayShort(date)} ${dayNumber(date)} ${monthShort(date)}`;
}

/** Non letta: arrivata dopo l'ultima lettura e non fatta da chi guarda. */
export const isUnread = (r: Pick<ActivityRow, "created_at" | "actor_member_id">, seenAt: string | null, me: string) =>
  r.actor_member_id !== me && (!seenAt || r.created_at > seenAt);
