import { exportOneClient } from "@/lib/clients/export";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Cliente non trovato.", { status: 404 });
  return exportOneClient(id);
}
