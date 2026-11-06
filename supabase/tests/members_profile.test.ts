import { describe, expect, it } from "vitest";
import { createOtherSalon, createTestSalon, inTx } from "./db";

/** Un giorno di apertura (martedì–sabato) fra 3 e 9 giorni da oggi: dentro l'anticipo massimo del link. */
const OPEN_DAY = (() => {
  const d = new Date(Date.now() + 3 * 86_400_000);
  while (d.getUTCDay() < 2) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
})();

/** Ridisegno novembre 2026, passo 6: profilo di chi lavora e foto del salone. */
describe("profilo del barbiere", () => {
  it("telefono, colore (0–3) e «prenotabile online» hanno i loro limiti", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      expect(await tx.error(`update members set agenda_color = 4 where id = $1`, [s.memberIds[0]])).toBe("23514");
      expect(await tx.error(`update members set phone = 'abc' where id = $1`, [s.memberIds[0]])).toBe("23514");
      expect(await tx.error(`update members set phone = '+39 340 555 0101', agenda_color = 2 where id = $1`, [s.memberIds[0]])).toBeNull();
      const [m] = await tx.q<{ bookable_online: boolean }>(`select bookable_online from members where id = $1`, [s.memberIds[0]]);
      expect(m!.bookable_online).toBe(true);
    });
  });

  it("chi è spento su «prenotabile online» non ha orari sul link, ma li ha in agenda", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.asAdmin();
      await tx.q(`update members set bookable_online = false where id = $1`, [s.memberIds[1]]);
      await tx.q(`update salons set max_advance_days = 60 where id = $1`, [s.salonId]);
      const only = (isPublic: boolean) =>
        tx.q<{ member_id: string }>(`select distinct member_id from free_slots($1, $2, null, $3::date, 1, $4)`, [s.salonId, s.serviceId, OPEN_DAY, isPublic]);
      expect((await only(true)).map((r) => r.member_id)).toEqual([s.memberIds[0]]);
      await tx.as(s.userId);
      expect((await only(false)).map((r) => r.member_id).sort()).toEqual([...s.memberIds].sort());
      const salon = await tx.q<{ p: { members: Array<{ id: string }> } }>(`select public_salon('salone-di-prova') as p`);
      expect(salon[0]!.p.members.map((m) => m.id)).toEqual([s.memberIds[0]]);
    });
  });
});

describe("foto del salone", () => {
  it("le vede e le cambia solo il titolare del proprio salone; al massimo 8", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const other = await createOtherSalon(tx);
      await tx.asAdmin();
      await tx.q(`insert into salon_photos (salon_id, path) values ($1, 'x/altrui.jpg')`, [other.salonId]);
      await tx.as(s.userId);
      expect(await tx.q(`select id from salon_photos`)).toHaveLength(0);
      expect(await tx.error(`insert into salon_photos (salon_id, path) values ($1, 'x/altrui2.jpg')`, [other.salonId])).not.toBeNull();
      for (let i = 0; i < 8; i++) await tx.q(`insert into salon_photos (salon_id, path, sort) values ($1, $2, $3)`, [s.salonId, `${s.salonId}/${i}.jpg`, i]);
      expect(await tx.error(`insert into salon_photos (salon_id, path) values ($1, 'nona.jpg')`, [s.salonId])).toBe("23514");
      await tx.asAdmin();
      const salon = await tx.q<{ p: { photos: string[] } }>(`select public_salon('salone-di-prova') as p`);
      expect(salon[0]!.p.photos).toHaveLength(8);
    });
  });

  it("le foto di chi lavora stanno in un bucket privato", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const other = await createOtherSalon(tx);
      await tx.asAdmin();
      await tx.q(`insert into storage.objects (bucket_id, name) values ('member-photos', $1 || '/m/x.jpg')`, [other.salonId]);
      await tx.as(s.userId);
      expect(await tx.q(`select name from storage.objects where bucket_id = 'member-photos'`)).toHaveLength(0);
      await tx.asAdmin();
      const [b] = await tx.q<{ public: boolean }>(`select public from storage.buckets where id = 'member-photos'`);
      expect(b!.public).toBe(false);
    });
  });
});
