import { describe, expect, it } from "vitest";
import { SALON, createTestSalon, inTx } from "./db";

type Pub = {
  name: string; slug: string; booking_online: boolean; services: Array<{ name: string }>;
  members: Array<Record<string, unknown>>; hours: unknown[]; stripe_customer_id?: unknown; vat_number?: unknown;
};
const get = async (tx: Parameters<Parameters<typeof inTx>[0]>[0], slug: string) =>
  (await tx.q<{ p: Pub | null }>(`select public.public_salon($1) as p`, [slug]))[0]!.p;

describe("public_salon", () => {
  it("chiunque (anche senza accesso) vede la pagina pubblica del salone", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      const p = await get(tx, "barberia-saragozza");
      expect(p).toMatchObject({ name: "Barberia Saragozza", slug: "barberia-saragozza" });
      expect(p!.services.length).toBeGreaterThan(0);
      expect(p!.members).toHaveLength(3);
      expect(p!.hours).toHaveLength(7);
    });
  });

  it("non espone dati privati: né email dei barbieri né dati di pagamento", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      const p = await get(tx, "barberia-saragozza");
      expect(Object.keys(p!.members[0]!).sort()).toEqual(["bio", "chair_no", "id", "name", "photo_path"]);
      expect(p).not.toHaveProperty("stripe_customer_id");
      expect(p).not.toHaveProperty("vat_number");
      expect(JSON.stringify(p)).not.toMatch(/invite_token|user_id|@/);
    });
  });

  it("slug inesistente, o salone eliminato, non restituisce nulla", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      expect(await get(tx, "non-esiste")).toBeNull();
      await tx.asAdmin();
      await tx.q(`update salons set deleted_at = now() where id = $1`, [SALON]);
      await tx.as(null);
      expect(await get(tx, "barberia-saragozza")).toBeNull();
    });
  });

  it("mostra solo servizi e barbieri attivi", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      await tx.q(`update services set active = false where salon_id = $1`, [s.salonId]);
      await tx.q(`update members set active = false where salon_id = $1 and chair_no = 1`, [s.salonId]);
      await tx.as(null);
      const p = await get(tx, "salone-di-prova");
      expect(p!.services).toHaveLength(0);
      expect(p!.members).toHaveLength(0);
    });
  });

  it("l'accesso diretto alle tabelle resta chiuso", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      expect(await tx.error(`select 1 from salons`)).toBe("42501");
      expect(await tx.error(`select 1 from services`)).toBe("42501");
    });
  });
});

describe("public_salon_slugs", () => {
  it("elenca solo i saloni con una pagina da mostrare", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(null);
      const slugs = (await tx.q<{ public_salon_slugs: string }>(`select * from public.public_salon_slugs()`)).map((r) => r.public_salon_slugs);
      expect(slugs).toContain("barberia-saragozza");
      expect(slugs).toContain("salone-di-prova");
      await tx.asAdmin();
      await tx.q(`update services set active = false where salon_id = $1`, [s.salonId]);
      await tx.q(`update salons set deleted_at = now() where id = $1`, [SALON]);
      await tx.as(null);
      const after = (await tx.q<{ public_salon_slugs: string }>(`select * from public.public_salon_slugs()`)).map((r) => r.public_salon_slugs);
      expect(after).not.toContain("salone-di-prova"); // senza servizi attivi
      expect(after).not.toContain("barberia-saragozza"); // eliminato
    });
  });
});
