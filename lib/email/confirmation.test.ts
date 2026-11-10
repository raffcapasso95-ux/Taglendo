import { createElement } from "react";
import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { ConfirmationEmail, mapsUrl, type ConfirmationEmailProps } from "./templates/ConfirmationEmail";

const base: ConfirmationEmailProps = {
  salonName: "Capasso Barber",
  firstName: "Raffaele",
  weekday: "martedì",
  when: "Mar 10 novembre, 14:45",
  service: "Taglio uomo · 30 min",
  barber: null,
  price: "20 €",
  address: "Via Filippo Palizzi 47, Napoli",
  manageUrl: "https://taglendo.it/capasso/prenotazione/x",
  calendarUrl: "https://taglendo.it/capasso/prenotazione/x/calendario.ics",
  cancelUntil: "martedì alle 12:45",
  phone: "333 919 3267",
  footer: "Capasso Barber",
  siteUrl: "https://taglendo.it",
};

const html = (p: Partial<ConfirmationEmailProps>) => render(createElement(ConfirmationEmail, { ...base, ...p }));

describe("email di prenotazione confermata", () => {
  it("con i prezzi nascosti dal salone non mostra il prezzo", async () => {
    expect(await html({ price: "20 €" })).toContain("20 € in negozio");
    const hidden = await html({ price: null });
    expect(hidden).not.toContain("Prezzo");
    expect(hidden).not.toContain("20 €");
  });

  it("giorno e ora in evidenza, indirizzo che apre Google Maps, chiamata al salone", async () => {
    const out = await html({});
    expect(out).toContain("Mar 10 novembre");
    expect(out).toContain("14:45");
    expect(out).toContain(mapsUrl(base.address!).replace(/&/g, "&amp;"));
    expect(out).toContain('href="tel:3339193267"');
    expect(out).toContain("Prenotazione confermata");
  });

  it("dice «oggi» e «domani» quando serve", async () => {
    expect(await html({ day: "oggi" })).toContain("Ci vediamo oggi, Raffaele!");
    expect(await html({ day: "domani" })).toContain("Ci vediamo domani, Raffaele!");
    expect(await html({})).toContain("Ci vediamo martedì, Raffaele!");
  });

  it("con il logo del salone lo mostra in alto", async () => {
    expect(await html({ logoUrl: "https://x.supabase.co/storage/v1/object/public/salon-photos/s/logo-1.png" })).toContain("logo-1.png");
  });
});
