import { describe, expect, it } from "vitest";
import { createTestSalon, inTx } from "./db";

describe("promemoria e avvisi", () => {
  it("il promemoria parte una sola volta: reminder_sent_at nasce vuoto", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      const [a] = await tx.q<{ reminder_sent_at: Date | null }>(
        `insert into appointments (salon_id, member_id, service_id, service_name, price_cents, starts_at, ends_at)
         values ($1, $2, $3, 'Taglio', 2000, now() + interval '1 day', now() + interval '1 day 30 minutes') returning reminder_sent_at`,
        [s.salonId, s.memberIds[0], s.serviceId],
      );
      expect(a!.reminder_sent_at).toBeNull();
    });
  });

  it("l'anticipo del promemoria è 24 ore se non si sceglie, e solo tra quelli previsti", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      const [p] = await tx.q<{ reminder_hours: number }>(`insert into email_prefs (salon_id) values ($1) on conflict (salon_id) do update set reminder = true returning reminder_hours`, [s.salonId]);
      expect(p!.reminder_hours).toBe(24);
      await tx.q(`update email_prefs set reminder_hours = 2 where salon_id = $1`, [s.salonId]);
      expect(await tx.error(`update email_prefs set reminder_hours = 6 where salon_id = $1`, [s.salonId])).toBe("23514");
    });
  });

  it("i link delle pagine del gestionale (salone, statistiche) non si possono dare a un salone", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      expect(await tx.error(`update salons set slug = 'salone' where id = $1`, [s.salonId])).toBe("23514");
      expect(await tx.error(`update salons set slug = 'statistiche' where id = $1`, [s.salonId])).toBe("23514");
    });
  });

  it("il riepilogo vale una volta al giorno per operatore", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      await tx.q(`insert into summary_runs (member_id, run_date) values ($1, current_date)`, [s.memberIds[0]]);
      expect(await tx.error(`insert into summary_runs (member_id, run_date) values ($1, current_date)`, [s.memberIds[0]])).toBe("23505");
      await tx.q(`insert into summary_runs (member_id, run_date) values ($1, current_date + 1)`, [s.memberIds[0]]);
    });
  });

  it("summary_runs non si legge né si scrive dagli utenti", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      expect(await tx.error(`select * from summary_runs`)).toBe("42501");
      expect(await tx.error(`insert into summary_runs (member_id, run_date) values ($1, current_date)`, [s.memberIds[0]])).toBe("42501");
    });
  });

  it("le iscrizioni push sono solo di chi le crea", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      await tx.q(`insert into push_subscriptions (member_id, endpoint, keys) values ($1, 'https://push.example/a', '{"p256dh":"x","auth":"y"}')`, [s.memberIds[0]]);
      await tx.as(null);
      expect(await tx.error(`select * from push_subscriptions`)).toBe("42501");
    });
  });
});
