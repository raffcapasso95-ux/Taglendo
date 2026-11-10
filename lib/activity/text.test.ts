import { describe, expect, it } from "vitest";
import { activityText, dayGroup, isUnread, type ActivityRow } from "./text";

const row = (p: Partial<ActivityRow>): ActivityRow => ({
  id: "1", kind: "nuovo", by_client: false, actor_name: "Andrea Conti", actor_member_id: "m1", client_name: "Luca Rossi", service_name: "Taglio uomo",
  member_name: "Marco Bianchi", starts_at: "2026-11-12T09:30:00Z", old_starts_at: null, old_member_name: null, created_at: "2026-11-10T08:00:00Z", ...p,
});
const TODAY = "2026-11-10";

describe("notifiche: i testi", () => {
  it("prenotazione online, con il barbiere quando sono più d'uno", () => {
    expect(activityText(row({ kind: "online", by_client: true, actor_name: null }), TODAY, true)).toEqual({ title: "Nuova prenotazione online", detail: "Luca Rossi · Taglio uomo · gio 12 nov, 10:30 con Marco" });
    expect(activityText(row({ kind: "online", actor_name: null }), TODAY, false).detail).toBe("Luca Rossi · Taglio uomo · gio 12 nov, 10:30");
  });
  it("chi del salone l'ha fatto", () => {
    expect(activityText(row({}), TODAY, false).title).toBe("Andrea ha fissato un appuntamento");
    expect(activityText(row({ kind: "annullato" }), TODAY, false).title).toBe("Andrea ha annullato un appuntamento");
    expect(activityText(row({ kind: "annullato", by_client: true, actor_name: null }), TODAY, false).title).toBe("Annullato dal cliente");
  });
  it("spostato: da quando a quando, oggi detto per esteso", () => {
    const t = activityText(row({ kind: "spostato", old_starts_at: "2026-11-10T14:00:00Z" }), TODAY, false);
    expect(t.detail).toBe("Luca Rossi: da oggi alle 15:00 a gio 12 nov, 10:30");
  });
  it("giorni: Oggi, Ieri, poi la data", () => {
    expect(dayGroup("2026-11-10T08:00:00Z", TODAY, "2026-11-09")).toBe("Oggi");
    expect(dayGroup("2026-11-09T08:00:00Z", TODAY, "2026-11-09")).toBe("Ieri");
    expect(dayGroup("2026-11-07T08:00:00Z", TODAY, "2026-11-09")).toBe("Sab 7 nov");
  });
  it("non lette: dopo l'ultima lettura e non fatte da me", () => {
    expect(isUnread(row({}), null, "m2")).toBe(true);
    expect(isUnread(row({}), null, "m1")).toBe(false);
    expect(isUnread(row({}), "2026-11-10T09:00:00Z", "m2")).toBe(false);
  });
});
