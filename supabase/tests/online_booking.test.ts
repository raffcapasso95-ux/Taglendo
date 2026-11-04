import { describe, expect, it } from "vitest";
import { createTestSalon, inTx, type Tx } from "./db";

const H = "h".repeat(64);

/** Un giorno di apertura tra 3 e 10 giorni da adesso, alle 10:00 di Roma. */
async function tenAm(tx: Tx) {
  const [r] = await tx.q<{ t: Date }>(
    `select ((d::date + time '10:00') at time zone 'Europe/Rome') as t
       from generate_series(current_date + 3, current_date + 10, interval '1 day') d
      where extract(dow from d) >= 2 order by d limit 1`,
  );
  return r!.t;
}

const request = async (tx: Tx, salon: string, email: string, hash = H) =>
  (await tx.q<{ r: { status: string; wait_seconds?: number } }>(`select public.request_booking_code($1, $2, $3, '{"x":1}'::jsonb) as r`, [salon, email, hash]))[0]!.r;
const check = async (tx: Tx, salon: string, email: string, hash = H) =>
  (await tx.q<{ r: { status: string; remaining?: number; payload?: { x: number } } }>(`select public.check_booking_code($1, $2, $3) as r`, [salon, email, hash]))[0]!.r;
const age = (tx: Tx, seconds: number) => tx.q(`update booking_codes set created_at = created_at - make_interval(secs => $1)`, [seconds]);

describe("codice di prenotazione", () => {
  it("si può chiedere, poi aspettare 60 secondi per chiederne un altro", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      expect(await request(tx, s.salonId, "Mario@Example.com")).toEqual({ status: "sent" });
      const again = await request(tx, s.salonId, "mario@example.com");
      expect(again.status).toBe("wait");
      expect(again.wait_seconds).toBeGreaterThan(0);
      expect(again.wait_seconds).toBeLessThanOrEqual(60);
      await age(tx, 61);
      expect(await request(tx, s.salonId, "mario@example.com")).toEqual({ status: "sent" });
    });
  });

  it("al massimo 5 richieste all'ora per email", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      for (let i = 0; i < 5; i++) {
        expect((await request(tx, s.salonId, "mario@example.com")).status).toBe("sent");
        await age(tx, 61);
      }
      expect((await request(tx, s.salonId, "mario@example.com")).status).toBe("limit");
      expect((await request(tx, s.salonId, "altro@example.com")).status).toBe("sent");
    });
  });

  it("il codice giusto restituisce la scelta del cliente e vale finché non lo si consuma", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await request(tx, s.salonId, "mario@example.com");
      expect(await check(tx, s.salonId, "mario@example.com")).toEqual({ status: "ok", payload: { x: 1 } });
      expect((await check(tx, s.salonId, "mario@example.com")).status).toBe("ok"); // orario preso? si riprova con un altro
      await tx.q(`select public.consume_booking_code($1, 'MARIO@example.com')`, [s.salonId]);
      expect((await check(tx, s.salonId, "mario@example.com")).status).toBe("none");
    });
  });

  it("5 errori bloccano il codice, anche se al sesto tentativo è giusto", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await request(tx, s.salonId, "mario@example.com");
      const remaining: Array<number | undefined> = [];
      for (let i = 0; i < 5; i++) {
        const r = await check(tx, s.salonId, "mario@example.com", "x".repeat(64));
        expect(r.status).toBe("wrong");
        remaining.push(r.remaining);
      }
      expect(remaining).toEqual([4, 3, 2, 1, 0]);
      expect((await check(tx, s.salonId, "mario@example.com")).status).toBe("locked");
      // dopo 60 secondi se ne chiede uno nuovo e si riparte
      await age(tx, 61);
      expect((await request(tx, s.salonId, "mario@example.com")).status).toBe("sent");
      expect((await check(tx, s.salonId, "mario@example.com")).status).toBe("ok");
    });
  });

  it("dopo 10 minuti il codice è scaduto", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await request(tx, s.salonId, "mario@example.com");
      await tx.q(`update booking_codes set expires_at = now() - interval '1 second'`);
      expect((await check(tx, s.salonId, "mario@example.com")).status).toBe("expired");
      expect((await check(tx, s.salonId, "mario@example.com")).status).toBe("none");
    });
  });

  it("un codice vale solo per il suo salone e la sua email", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await request(tx, s.salonId, "mario@example.com");
      expect((await check(tx, s.salonId, "luigi@example.com")).status).toBe("none");
      expect((await check(tx, "5a999999-0000-4000-8000-000000000009", "mario@example.com")).status).toBe("none");
    });
  });

  it("nessun utente, nemmeno il titolare, può chiamare le funzioni", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      for (const who of [null, s.userId]) {
        await tx.as(who);
        expect(await tx.error(`select public.request_booking_code($1, 'a@b.it', $2, '{}')`, [s.salonId, H])).toBe("42501");
        expect(await tx.error(`select public.check_booking_code($1, 'a@b.it', $2)`, [s.salonId, H])).toBe("42501");
      }
    });
  });
});

describe("conferma della prenotazione online", () => {
  const confirm = (tx: Tx, p: { salon: string; service: string; member?: string | null; at: Date; email?: string; name?: string; phone?: string; marketing?: boolean }) =>
    tx.q<{ r: { id: string; public_code: string; manage_token: string; client_id: string; member_id: string; price_cents: number } }>(
      `select public.confirm_online_booking($1, $2, $3, $4, $5, $6, $7, $8) as r`,
      [p.salon, p.service, p.member ?? null, p.at, p.name ?? "Mario Verdi", p.email ?? "mario@example.com", p.phone ?? "", p.marketing ?? false],
    );

  it("crea cliente e appuntamento online, con nome e prezzo copiati", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const at = await tenAm(tx);
      const [{ r }] = (await confirm(tx, { salon: s.salonId, service: s.serviceId, at, phone: "333 123", marketing: true })) as [{ r: Awaited<ReturnType<typeof confirm>>[0]["r"] }];
      expect(r.public_code).toMatch(/^TG-\d{4,6}$/);
      expect(r.manage_token.length).toBeGreaterThanOrEqual(32);
      const [a] = await tx.q<{ source: string; status: string; service_name: string; price_cents: number }>(`select source, status, service_name, price_cents from appointments where id = $1`, [r.id]);
      expect(a).toMatchObject({ source: "online", status: "confermato" });
      const [c] = await tx.q<{ name: string; email: string; phone: string; privacy_accepted_at: Date | null; marketing_opt_in: boolean }>(`select name, email, phone, privacy_accepted_at, marketing_opt_in from clients where id = $1`, [r.client_id]);
      expect(c).toMatchObject({ name: "Mario Verdi", email: "mario@example.com", phone: "333 123", marketing_opt_in: true });
      expect(c!.privacy_accepted_at).not.toBeNull();
    });
  });

  it("la stessa email nello stesso salone è lo stesso cliente", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const at = await tenAm(tx);
      const later = new Date(at.getTime() + 60 * 60000);
      const first = (await confirm(tx, { salon: s.salonId, service: s.serviceId, at, email: "Mario@Example.com" }))[0]!.r;
      const second = (await confirm(tx, { salon: s.salonId, service: s.serviceId, at: later, email: "mario@example.com", name: "Altro Nome" }))[0]!.r;
      expect(second.client_id).toBe(first.client_id);
      const [n] = await tx.q<{ n: string }>(`select count(*) as n from clients where salon_id = $1`, [s.salonId]);
      expect(n!.n).toBe("1");
    });
  });

  it("orario già preso: la seconda prenotazione fallisce", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const at = await tenAm(tx);
      await confirm(tx, { salon: s.salonId, service: s.serviceId, at });
      expect(await tx.error(`select public.confirm_online_booking($1, $2, null, $3, 'Luigi', 'luigi@example.com', '', false)`, [s.salonId, s.serviceId, at])).toBe("P0001");
    });
  });

  it("orari che non sono liberi per il pubblico vengono rifiutati: pausa, preavviso, chiuso", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const [r] = await tx.q<{ lunch: Date; soon: Date; closed: Date }>(
        `select ((d::date + time '13:30') at time zone 'Europe/Rome') as lunch,
                now() + interval '30 minutes' as soon,
                ((dm::date + time '10:00') at time zone 'Europe/Rome') as closed
           from (select d from generate_series(current_date + 3, current_date + 10, interval '1 day') d where extract(dow from d) >= 2 limit 1) a,
                (select d as dm from generate_series(current_date + 3, current_date + 10, interval '1 day') d where extract(dow from d) < 2 limit 1) b`,
      );
      for (const at of [r!.lunch, r!.soon, r!.closed]) {
        expect(await tx.error(`select public.confirm_online_booking($1, $2, null, $3, 'Luigi', 'l@example.com', '', false)`, [s.salonId, s.serviceId, at])).toBe("P0001");
      }
    });
  });

  it("con la prenotazione online spenta non si prenota", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const at = await tenAm(tx);
      await tx.q(`update salons set booking_online = false where id = $1`, [s.salonId]);
      expect(await tx.error(`select public.confirm_online_booking($1, $2, null, $3, 'Luigi', 'l@example.com', '', false)`, [s.salonId, s.serviceId, at])).toBe("P0001");
    });
  });

  it("con due barbieri sceglie il primo libero, e il secondo prende l'orario successivo allo stesso momento", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      const at = await tenAm(tx);
      const a = (await confirm(tx, { salon: s.salonId, service: s.serviceId, at, email: "a@example.com" }))[0]!.r;
      const b = (await confirm(tx, { salon: s.salonId, service: s.serviceId, at, email: "b@example.com" }))[0]!.r;
      expect(a.member_id).toBe(s.memberIds[0]);
      expect(b.member_id).toBe(s.memberIds[1]);
      expect(await tx.error(`select public.confirm_online_booking($1, $2, null, $3, 'C', 'c@example.com', '', false)`, [s.salonId, s.serviceId, at])).toBe("P0001");
    });
  });

  it("nessun utente può chiamare la conferma", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const at = await tenAm(tx);
      for (const who of [null, s.userId]) {
        await tx.as(who);
        expect(await tx.error(`select public.confirm_online_booking($1, $2, null, $3, 'L', 'l@example.com', '', false)`, [s.salonId, s.serviceId, at])).toBe("42501");
      }
    });
  });
});
