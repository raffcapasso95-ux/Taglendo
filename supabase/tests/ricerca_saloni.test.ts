import { describe, expect, it } from "vitest";
import { SALON, createTestSalon, inTx, type Tx } from "./db";

const BOLOGNA = [44.4949, 11.3426] as const;
type Row = { slug: string; distance_km: number; price_from_cents: number | null; services: Array<{ name: string; duration_min: number; price_cents: number | null }>; next_slots: string[] | null; city: string };

const search = (tx: Tx, lat: number, lng: number, radius = 30) =>
  tx.q<Row>(`select slug, distance_km, price_from_cents, services, next_slots, city from find_salons($1, $2, $3, 40, null, null)`, [lat, lng, radius]);

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
      expect(await tx.error(`select * from find_salons(120, 11, 30, 40, null, null)`, [])).toBe("22023");
      expect(await tx.error(`select * from find_salons(44, 11, 5000, 40, null, null)`, [])).toBe("22023");
      const cities = await tx.q<{ city: string; salons: number }>(`select city, salons from salon_cities()`);
      expect(cities.map((c) => c.city)).toEqual(expect.arrayContaining(["Bologna", "Modena"]));
      // gli ultimi arrivati: solo in ordine di arrivo, anche se il più recente non ha foto
      const recent = (await tx.q<{ slug: string }>(`select slug from recent_salons(24)`)).map((r) => r.slug);
      expect(recent).toContain("salone-di-prova");
      expect(recent.indexOf("salone-di-prova")).toBeLessThan(recent.indexOf("barberia-saragozza"));
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

describe("ricerca per servizio e data", () => {
  type R = { slug: string; services: Array<{ name: string }>; next_slots: string[] | null; price_from_cents: number | null };
  const find = (tx: Tx, service: string | null, date: string | null) =>
    tx.q<R>(`select slug, services, next_slots, price_from_cents from find_salons(44.4949, 11.3426, 30, 40, $1, $2::date)`, [service, date]);

  it("il servizio filtra i saloni e mette in testa i servizi cercati, con il prezzo «da» di quelli", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      const [demo] = (await find(tx, "BARBA", null)).filter((r) => r.slug === "barberia-saragozza");
      expect(demo!.services[0]!.name.toLowerCase()).toContain("barba");
      expect((await find(tx, "permanente", null)).map((r) => r.slug)).not.toContain("barberia-saragozza");
      const all = (await find(tx, null, null)).find((r) => r.slug === "barberia-saragozza")!;
      expect(demo!.price_from_cents).toBeGreaterThanOrEqual(all.price_from_cents!);
    });
  });

  it("con un giorno: solo chi ha posto quel giorno, e gli orari sono di quel giorno", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      // il salone demo è chiuso la domenica: cerco la prossima domenica e il prossimo martedì
      const [{ sun, tue }] = await tx.q<{ sun: string; tue: string }>(
        `select (current_date + ((7 - extract(dow from current_date)::int) % 7 + 7))::text as sun,
                (current_date + ((9 - extract(dow from current_date)::int) % 7 + 7))::text as tue`,
      ) as [{ sun: string; tue: string }];
      expect((await find(tx, null, sun)).map((r) => r.slug)).not.toContain("barberia-saragozza");
      const [open] = (await find(tx, null, tue)).filter((r) => r.slug === "barberia-saragozza");
      expect(open!.next_slots!.length).toBeGreaterThan(0);
      const days = await tx.q<{ d: string }>(`select distinct (unnest($1::timestamptz[]) at time zone 'Europe/Rome')::date::text as d`, [open!.next_slots]);
      expect(days.map((d) => d.d)).toEqual([tue]);
      expect(await tx.error(`select * from find_salons(44.4, 11.3, 30, 40, null, current_date + 400)`, [])).toBe("22023");
    });
  });

  it("i servizi più diffusi per i suggerimenti", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      const names = await tx.q<{ name: string }>(`select name from service_names(12)`);
      expect(names.length).toBeGreaterThan(0);
    });
  });
});

describe("ricerca con i filtri (ridisegno del sito)", () => {
  type F = { slug: string; next_slots: string[] | null; open_now: boolean; closes_min: number | null; is_new: boolean; barbers: number; services: Array<{ name: string }> };
  const filtered = (tx: Tx, filters: object, radius = 30) =>
    tx.q<F>(
      `select slug, next_slots, open_now, closes_min, is_new, barbers, services from find_salons(44.4949, 11.3426, $1, 40, null, null, $2::jsonb)`,
      [radius, JSON.stringify(filters)],
    );
  const demoIn = async (tx: Tx, filters: object) => (await filtered(tx, filters)).find((r) => r.slug === "barberia-saragozza");

  it("senza filtri restituisce anche aperto ora, nuovo e numero di barbieri", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      const demo = await demoIn(tx, {});
      expect(demo).toBeDefined();
      expect(typeof demo!.open_now).toBe("boolean");
      expect(demo!.open_now).toBe(demo!.closes_min !== null);
      expect(demo!.barbers).toBeGreaterThan(0);
    });
  });

  it("servizi: tutti quelli scelti devono esserci; i servizi trovati vanno in testa", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      const barba = await demoIn(tx, { services: ["Barba"] });
      expect(barba!.services[0]!.name.toLowerCase()).toContain("barba");
      expect(await demoIn(tx, { services: ["barba", "permanente"] })).toBeUndefined();
    });
  });

  it("aperto ora segue gli orari e le chiusure di tutto il salone", async () => {
    await inTx(async (tx) => {
      await tx.asAdmin();
      // il salone aperto tutto il giorno, ogni giorno
      await tx.q(`update opening_hours set closed = false where salon_id = $1`, [SALON]);
      await tx.q(`delete from opening_ranges where salon_id = $1`, [SALON]);
      await tx.q(`insert into opening_ranges (salon_id, weekday, start_min, end_min) select $1, d, 0, 1440 from generate_series(0, 6) d`, [SALON]);
      await tx.as(null);
      expect((await demoIn(tx, { open_now: true }))?.closes_min).toBe(1440);
      await tx.asAdmin();
      await tx.q(`insert into closures (salon_id, starts_on, ends_on) values ($1, (now() at time zone 'Europe/Rome')::date, (now() at time zone 'Europe/Rome')::date)`, [SALON]);
      await tx.as(null);
      expect(await demoIn(tx, { open_now: true })).toBeUndefined();
      expect((await demoIn(tx, {}))!.open_now).toBe(false);
    });
  });

  it("fascia oraria e liberi oggi: solo orari in quella fascia, o di oggi", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      for (const [band, lo, hi] of [["mattina", 0, 780], ["pomeriggio", 780, 1080], ["sera", 1080, 1440]] as const) {
        const r = await demoIn(tx, { band });
        if (!r) continue; // nessun posto in quella fascia nei prossimi 7 giorni: il salone non compare
        const mins = await tx.q<{ m: number }>(
          `select (extract(hour from t at time zone 'Europe/Rome') * 60 + extract(minute from t at time zone 'Europe/Rome'))::int as m from unnest($1::timestamptz[]) t`,
          [r.next_slots],
        );
        expect(mins.every((x) => x.m >= lo && x.m < hi), band).toBe(true);
      }
      const today = await demoIn(tx, { free_today: true });
      if (today) {
        const days = await tx.q<{ d: boolean }>(`select bool_and((t at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date) as d from unnest($1::timestamptz[]) t`, [today.next_slots]);
        expect(days[0]!.d).toBe(true);
      }
    });
  });

  it("nuovi: solo i saloni arrivati da 30 giorni o meno; ordinamento per primo orario", async () => {
    await inTx(async (tx) => {
      await tx.asAdmin();
      await tx.q(`update salons set created_at = now() - interval '40 days' where id = $1`, [SALON]);
      await tx.as(null);
      expect(await demoIn(tx, { is_new: true })).toBeUndefined();
      expect((await demoIn(tx, {}))!.is_new).toBe(false);
      const first = await filtered(tx, { sort: "first" }, 300);
      const firsts = first.map((r) => r.next_slots?.[0] ?? "9999");
      expect([...firsts].sort()).toEqual(firsts);
    });
  });

  it("filtri non validi: errore", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      for (const f of [{ band: "notte" }, { sort: "prezzo" }, { services: Array(9).fill("x").map((x, i) => x + i) }, [1]]) {
        expect(await tx.error(`select * from find_salons(44.4, 11.3, 30, 40, null, null, $1::jsonb)`, [JSON.stringify(f)]), JSON.stringify(f)).toBe("22023");
      }
    });
  });

  it("città: barberie e quante hanno posto oggi e domani; gli ultimi arrivati con il primo posto di oggi", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      const cities = await tx.q<{ city: string; salons: number; free_today: number; free_tomorrow: number }>(`select * from city_stats(12)`);
      const bo = cities.find((c) => c.city === "Bologna")!;
      expect(bo.salons).toBeGreaterThan(0);
      expect(bo.free_today).toBeLessThanOrEqual(bo.salons);
      expect(bo.free_tomorrow).toBeLessThanOrEqual(bo.salons);
      const [r] = (await tx.q<{ slug: string; barbers: number; address: string }>(`select slug, barbers, address from recent_salons(24)`)).filter((x) => x.slug === "barberia-saragozza");
      expect(r!.barbers).toBeGreaterThan(0);
      expect(r!.address).toBeTruthy();
    });
  });
});

describe("«Da sapere» del salone", () => {
  it("lo scrive solo il titolare, con valori controllati; la pagina pubblica lo mostra", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      await tx.q(
        `update salons set specialties = 'Sfumature', payment_methods = '{contanti,carta}', products = 'Proraso', kids_until = 12, step_free_access = true, access_note = '3 min dalla stazione' where id = $1`,
        [s.salonId],
      );
      expect(await tx.error(`update salons set payment_methods = '{assegni}' where id = $1`, [s.salonId])).toBe("23514");
      expect(await tx.error(`update salons set access_note = repeat('x', 61) where id = $1`, [s.salonId])).toBe("23514");
      // un altro salone non lo tocca
      await tx.q(`update salons set specialties = 'altro' where id = $1`, [SALON]);
      await tx.as(null);
      const [{ p }] = (await tx.q<{ p: Record<string, unknown> }>(`select public_salon('salone-di-prova') as p`)) as [{ p: Record<string, unknown> }];
      expect(p).toMatchObject({ specialties: "Sfumature", payment_methods: ["contanti", "carta"], products: "Proraso", kids_until: 12, step_free_access: true, access_note: "3 min dalla stazione" });
      await tx.asAdmin();
      const [demo] = await tx.q<{ specialties: string | null }>(`select specialties from salons where id = $1`, [SALON]);
      expect(demo!.specialties).not.toBe("altro");
    });
  });
});
