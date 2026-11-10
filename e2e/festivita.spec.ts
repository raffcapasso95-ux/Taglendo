import { expect, test } from "@playwright/test";
import { freshOwner } from "./agenda-helpers";
import { adminSelect } from "./helpers";

const CRON = "Bearer local-cron-secret";

test("Festività: si spuntano le feste chiuse (ogni anno) e si aggiunge il santo patrono", async ({ page, request }) => {
  const name = `Barberia Feste ${Date.now()}`;
  await freshOwner(page, name);
  const [salon] = await adminSelect<{ id: string }>("salons", `select=id&name=eq.${encodeURIComponent(name)}`);
  const holidays = (key: string) => adminSelect<{ starts_on: string; note: string }>("closures", `select=starts_on,note&salon_id=eq.${salon!.id}&holiday=eq.${key}&order=starts_on`);

  await page.goto("/listino/chiusure");
  await expect(page.getByRole("heading", { name: "Festività" })).toBeVisible();
  const natale = page.getByRole("switch", { name: /^Natale/ });
  await expect(natale).toHaveAttribute("aria-checked", "false");
  await natale.click();
  await expect(natale).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Natale: salone chiuso")).toBeVisible();
  // quest'anno e il prossimo: chiusure vere, che agenda e link già rispettano
  await expect.poll(async () => (await holidays("natale")).map((c) => c.starts_on.slice(5))).toEqual(["12-25", "12-25"]);
  // non compaiono tra le chiusure fatte a mano
  await expect(page.getByText("Nessuna chiusura in programma.")).toBeVisible();

  await page.getByRole("button", { name: "+ Aggiungi il santo patrono" }).click();
  await page.getByLabel("Nome · facoltativo").fill("San Gennaro");
  await page.getByLabel("Giorno").selectOption("19");
  await page.getByLabel("Mese").selectOption({ label: "settembre" });
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByRole("switch", { name: /^San Gennaro/ })).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await holidays("patrono")).map((c) => `${c.starts_on.slice(5)} ${c.note}`)[0]).toBe("09-19 San Gennaro");

  // spenta la festa, le sue chiusure future spariscono
  await natale.click();
  await expect(natale).toHaveAttribute("aria-checked", "false");
  await expect.poll(async () => (await holidays("natale")).length).toBe(0);

  // il lavoro di ogni notte si può lanciare a mano
  const r = await request.get("/api/cron/run?job=festivita", { headers: { Authorization: CRON } });
  expect(r.status()).toBe(200);
  expect(typeof (await r.json()).holidays).toBe("number");
});
