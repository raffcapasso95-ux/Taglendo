import { Client } from "pg";

/** Database locale di `supabase start`. */
export const DB_URL =
  process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export const SALON = "5a100000-0000-4000-8000-000000000001";
export const ANDREA = "a0000000-0000-4000-8000-000000000001"; // titolare
export const MARCO = "a0000000-0000-4000-8000-000000000002"; // barbiere
export const MEMBER_ANDREA = "3e300000-0000-4000-8000-000000000001";
export const MEMBER_MARCO = "3e300000-0000-4000-8000-000000000002";
export const SERVICE_TAGLIO = "5e500000-0000-4000-8000-000000000001";

export type Tx = {
  q: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
  /** Da qui in poi le query girano come questo utente (null = anon). */
  as: (userId: string | null) => Promise<void>;
  /** Torna a postgres (salta la RLS) per preparare i dati. */
  asAdmin: () => Promise<void>;
  /** Esegue la query dentro un savepoint e restituisce il codice SQLSTATE dell’errore, o null. */
  error: (sql: string, params?: unknown[]) => Promise<string | null>;
};

/** Esegue fn in una transazione annullata alla fine: il database resta com’era. */
export async function inTx(fn: (tx: Tx) => Promise<void>): Promise<void> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query("begin");
    const tx: Tx = {
      q: async (sql, params) => (await client.query(sql, params)).rows,
      as: async (userId) => {
        await client.query("reset role");
        if (userId) {
          await client.query("select set_config('request.jwt.claims', $1, true)", [
            JSON.stringify({ sub: userId, role: "authenticated" }),
          ]);
          await client.query("set local role authenticated");
        } else {
          await client.query("select set_config('request.jwt.claims', '{\"role\":\"anon\"}', true)");
          await client.query("set local role anon");
        }
      },
      asAdmin: async () => {
        await client.query("reset role");
      },
      error: async (sql, params) => {
        await client.query("savepoint t");
        try {
          await client.query(sql, params);
          await client.query("release savepoint t");
          return null;
        } catch (e) {
          await client.query("rollback to savepoint t");
          return (e as { code?: string }).code ?? "unknown";
        }
      },
    };
    await fn(tx);
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

/** Crea un secondo salone con il suo titolare (come postgres). */
export async function createOtherSalon(tx: Tx) {
  const userId = "b0000000-0000-4000-8000-000000000001";
  const salonId = "5a200000-0000-4000-8000-000000000001";
  await tx.asAdmin();
  await tx.q(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
     values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
             'altro@example.com', '', now(), now())`,
    [userId],
  );
  await tx.q(
    `insert into salons (id, slug, name, phone) values ($1, 'altra-barberia', 'Altra Barberia', '051 000 0000')`,
    [salonId],
  );
  const [member] = await tx.q<{ id: string }>(
    `insert into members (salon_id, user_id, name, role, chair_no) values ($1, $2, 'Gino', 'owner', 1) returning id`,
    [salonId, userId],
  );
  const [client] = await tx.q<{ id: string }>(
    `insert into clients (salon_id, name, phone) values ($1, 'Cliente Altrui', '+39 300 000 0000') returning id`,
    [salonId],
  );
  return { userId, salonId, memberId: member!.id, clientId: client!.id };
}
