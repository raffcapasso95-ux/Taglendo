import { describe, expect, it } from "vitest";
import { createOtherSalon, createTestSalon, inTx } from "./db";

/** Ridisegno novembre 2026: avatar del cliente (colore e foto) e prezzo fatto dell'appuntamento. */
describe("avatar dei clienti", () => {
  it("il colore è da 0 a 4 e può restare vuoto (allora si ricava dal nome)", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      await tx.q(`insert into clients (salon_id, name, avatar_color) values ($1, 'Con colore', 3), ($1, 'Senza colore', null)`, [s.salonId]);
      expect(await tx.error(`insert into clients (salon_id, name, avatar_color) values ($1, 'Fuori scala', 5)`, [s.salonId])).toBe("23514");
    });
  });

  it("colore e foto arrivano da clients_visible, ma solo al proprio salone", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const other = await createOtherSalon(tx);
      await tx.asAdmin();
      await tx.q(`insert into clients (salon_id, name, avatar_color, photo_path) values ($1::uuid, 'Mio', 2, $1::text || '/c.jpg')`, [s.salonId]);
      await tx.q(`insert into clients (salon_id, name, avatar_color) values ($1, 'Altrui', 4)`, [other.salonId]);
      await tx.as(s.userId);
      const rows = await tx.q<{ name: string; avatar_color: number; photo_path: string | null }>(`select name, avatar_color, photo_path from clients_visible order by name`);
      expect(rows.map((r) => r.name)).toEqual(["Mio"]);
      expect(rows[0]).toMatchObject({ avatar_color: 2 });
      expect(rows[0]!.photo_path).toContain("/c.jpg");
    });
  });

  it("la foto di un salone non si legge né si scrive dall'altro", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const other = await createOtherSalon(tx);
      await tx.asAdmin();
      await tx.q(`insert into storage.objects (bucket_id, name, owner) values ('client-photos', $1 || '/x.jpg', null)`, [other.salonId]);
      await tx.as(s.userId);
      const visible = await tx.q(`select name from storage.objects where bucket_id = 'client-photos'`);
      expect(visible).toHaveLength(0);
      // scrivere nella cartella dell'altro salone è vietato; nella propria sì
      expect(await tx.error(`insert into storage.objects (bucket_id, name) values ('client-photos', $1 || '/y.jpg')`, [other.salonId])).not.toBeNull();
      expect(await tx.error(`insert into storage.objects (bucket_id, name) values ('client-photos', $1 || '/y.jpg')`, [s.salonId])).toBeNull();
    });
  });
});

describe("prezzo fatto", () => {
  it("senza dirlo, il prezzo di listino copiato è quello pagato", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      const [a] = await tx.q<{ price_cents: number; list_price_cents: number; price_note: string | null }>(
        `insert into appointments (salon_id, member_id, service_id, service_name, price_cents, starts_at, ends_at)
         values ($1, $2, $3, 'Taglio', 2000, now() + interval '1 day', now() + interval '1 day 30 minutes') returning price_cents, list_price_cents, price_note`,
        [s.salonId, s.memberIds[0], s.serviceId],
      );
      expect(a).toEqual({ price_cents: 2000, list_price_cents: 2000, price_note: null });
    });
  });

  it("uno sconto tiene il listino a parte, con il motivo; i prezzi non sono negativi", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      const [a] = await tx.q<{ price_cents: number; list_price_cents: number; price_note: string }>(
        `insert into appointments (salon_id, member_id, service_id, service_name, price_cents, list_price_cents, price_note, starts_at, ends_at)
         values ($1, $2, $3, 'Taglio', 1500, 2000, 'Promo studenti', now() + interval '1 day', now() + interval '1 day 30 minutes') returning price_cents, list_price_cents, price_note`,
        [s.salonId, s.memberIds[0], s.serviceId],
      );
      expect(a).toEqual({ price_cents: 1500, list_price_cents: 2000, price_note: "Promo studenti" });
      expect(await tx.error(`update appointments set price_cents = -1`)).toBe("23514");
      expect(await tx.error(`update appointments set price_note = repeat('x', 61)`)).toBe("23514");
    });
  });
});
