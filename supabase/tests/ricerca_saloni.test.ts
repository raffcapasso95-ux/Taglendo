import { describe, expect, it } from "vitest";
import { SALON, createTestSalon, inTx, type Tx } from "./db";

const BOLOGNA = [44.4949, 11.3426] as const;
type Row = { slug: string; distance_km: number; price_from_cents: number | null; services: Array<{ name: string; duration_min: number; price_cents: number | null }>; next_slots: string[] | null; city: string };

const search = (tx: Tx, lat: number, lng: number, radius = 30) =>
  tx.q<Row>(`select slug, distance_km, price_from_cents, services, next_slots, city from find_salons($1, $2, $3)`, [lat, lng, radius]);

/** Un salone di prova pronto per la ricerca, a Modena. */
async function listedSalon(tx: Tx) {
  const s = await createTestSalon(tx);
  await tx.asAdmin();
  await tx.q(`update salons set onboarding_step = 5, lat = 44.6471, lng = 10.9252, city = 'Modena' where id = $1`, [s.salonId]);
  return s;
}

describe("ricerca dei saloni", () => {
  it("chiunque trova i saloni attorno a un punto, dal più vicino, con distanza, prezzo «da» e primo orario", async () => {
    await inTx(async (tx) => {
      await listedSalon(tx);
      await tx.as(null); // visitatore
      // solo i due saloni di questa prova (le prove end-to-end possono averne lasciati altri nel database locale)
      const near = (await search(tx, ...BOLOGNA, 60)).filter((r) => ["barberia-saragozza", "salone-di-prova"].includes(r.slug));
      expect(near.map((r) => r.slug)).toEqual(["barberia-saragozza", "salone-di-prova"]);
      expect(near[0]!.distance_km).toBeLessThan(2);
      expect(near[1]!.distance_km).toBeGreaterThan(30);
      expect(near[0]!.price_from_cents).toBeGreaterThan(0);
      expect(near[0]!.services.length).toBeGreaterThan(0);
      expect(near[0]!.services.length).toBeLessThanOrEqual(3);
      expect(near[0]!.services[0]).toMatchObject({ name: expect.any(String), duration_min: expect.any(Number), price_cents: expect.any(Number) });
      // i prossimi orari: al massimo 4, in ordine, tutti diversi
      const slots = near[0]!.next_slots!;
      expect(slots.length).toBeGreaterThan(0);
      expect(slots.length).toBeLessThanOrEqual(4);
      expect([...slots].sort()).toEqual(slots);
      expect(new Set(slots).size).toBe(slots.length);
      // raggio stretto: solo Bologna
      expect((await search(tx, ...BOLOGNA, 10)).map((r) => r.slug)).not.toContain("salone-di-prova");
      // lontano da tutto: niente
      expect(await search(tx, 40.8333, 14.25, 30)).toHaveLength(0);
    });
  });

  it("non compare chi: si è tolto, non ha finito il primo avvio, non ha posizione, è eliminato, ha la prova scaduta", async () => {
    await inTx(async (tx) => {
      const s = await listedSalon(tx);
      const visible = async () => {
        await tx.as(null);
        const rows = await search(tx, 44.6471, 10.9252, 5);
        await tx.asAdmin();
        return rows.length;
      };
      expect(await visible()).toBe(1);
      for (const [off, on] of [
        ["listed = false", "listed = true"],
        ["onboarding_step = 3", "onboarding_step = 5"],
        ["lat = null, lng = null", "lat = 44.6471, lng = 10.9252"],
        ["deleted_at = now()", "deleted_at = null"],
        ["trial_ends_at = now() - interval '1 day'", "trial_ends_at = now() + interval '5 days'"],
        ["sub_status = 'canceled'", "sub_status = 'trialing'"],
      ] as const) {
        await tx.q(`update salons set ${off} where id = $1`, [s.salonId]);
        expect(await visible(), off).toBe(0);
        await tx.q(`update salons set ${on} where id = $1`, [s.salonId]);
      }
      expect(await visible()).toBe(1);
      await tx.q(`update services set active = false where salon_id = $1`, [s.salonId]);
      expect(await visible()).toBe(0);
    });
  });

  it("prezzi nascosti e prenotazione spenta non svelano niente", async () => {
    await inTx(async (tx) => {
      const s = await listedSalon(tx);
      await tx.q(`update salons set show_prices = false, booking_online = false where id = $1`, [s.salonId]);
      await tx.as(null);
      const [r] = await search(tx, 44.6471, 10.9252, 5);
      expect(r).toMatchObject({ price_from_cents: null, next_slots: null });
      expect(r!.services.every((x) => x.price_cents === null)).toBe(true); // nemmeno nei servizi
    });
  });

  it("valori fuori misura: errore; le città in elenco", async () => {
    await inTx(async (tx) => {
      await listedSalon(tx);
      await tx.as(null);
      expect(await tx.error(`select * from find_salons(120, 11, 30)`, [])).toBe("22023");
      expect(await tx.error(`select * from find_salons(44, 11, 5000)`, [])).toBe("22023");
      const cities = await tx.q<{ city: string; salons: number }>(`select city, salons from salon_cities()`);
      expect(cities.map((c) => c.city)).toEqual(expect.arrayContaining(["Bologna", "Modena"]));
      // gli ultimi arrivati: prima chi ha una foto
      const recent = (await tx.q<{ slug: string }>(`select slug from recent_salons(24)`)).map((r) => r.slug);
      expect(recent).toContain("salone-di-prova");
      expect(recent.indexOf("barberia-saragozza")).toBeLessThan(recent.indexOf("salone-di-prova"));
    });
  });

  it("solo il titolare si toglie dalla ricerca; posizione a metà rifiutata; link nuovi riservati", async () => {
    await inTx(async (tx) => {
      const s = await listedSalon(tx);
      await tx.as(s.userId);
      await tx.q(`update salons set listed = false where id = $1`, [s.salonId]);
      await tx.asAdmin();
      const [r] = await tx.q<{ listed: boolean }>(`select listed from salons where id = $1`, [s.salonId]);
      expect(r!.listed).toBe(false);
      expect(await tx.error(`update salons set lat = null where id = $1`, [SALON])).toBe("23514");
      expect(await tx.error(`update salons set slug = 'cerca' where id = $1`, [SALON])).toBe("23514");
    });
  });
});
