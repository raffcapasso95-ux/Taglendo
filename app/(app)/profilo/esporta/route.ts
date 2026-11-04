import { requireUser } from "@/lib/auth/session";
import { romeDate } from "@/lib/dates/rome";
import { createClient } from "@/lib/supabase/server";

/** I dati personali di chi chiede: account e posti nei saloni. */
export async function GET() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("members")
    .select("name, role, chair_no, active, salon:salons(name, slug, phone, address)")
    .eq("user_id", user.id);
  const body = JSON.stringify(
    {
      esportato_il: new Date().toISOString(),
      account: {
        email: user.email,
        nome: (user.user_metadata?.name as string | undefined) ?? null,
        creato_il: user.created_at,
        ultimo_accesso: user.last_sign_in_at ?? null,
      },
      saloni: members ?? [],
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="taglendo-i-miei-dati-${romeDate(new Date())}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
