import { getUser } from "@/lib/auth/session";

/** La sessione è ancora valida? Serve alla finestra «Accedi di nuovo». Mai in cache. */
export async function GET() {
  const user = await getUser();
  return Response.json({ valid: Boolean(user), email: user?.email ?? null }, { headers: { "Cache-Control": "no-store" } });
}
