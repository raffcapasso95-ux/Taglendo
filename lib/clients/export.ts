import "server-only";
import { requireSalon } from "@/lib/auth/session";
import { romeDate } from "@/lib/dates/rome";
import { csvDate, csvEuros, csvFile, csvFileName, csvRow } from "@/lib/rules/csv";
import { createClient } from "@/lib/supabase/server";

const STATUS: Record<string, string> = { confermato: "Confermato", completato: "Completato", annullato: "Annullato", non_presentato: "Non presentato" };

function download(body: string, name: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

const forbidden = () => new Response("Solo il titolare può esportare i dati dei clienti.", { status: 403 });

/** Tutti i clienti del salone, una riga ciascuno. Solo titolare. */
export async function exportAllClients() {
  const { role, salon } = await requireSalon();
  if (role !== "owner") return forbidden();
  const supabase = await createClient();
  const [clients, stats] = await Promise.all([
    supabase.from("clients_visible").select("id, name, phone, email, note, created_at, marketing_opt_in").eq("salon_id", salon.id).order("name"),
    supabase.from("client_stats").select("client_id, visits, last_visit_at, spent_cents").eq("salon_id", salon.id),
  ]);
  const byId = new Map((stats.data ?? []).map((s) => [s.client_id, s]));
  const rows = [
    csvRow(["Nome", "Telefono", "Email", "Note", "Cliente dal", "Visite", "Ultima visita", "Speso (€)", "Consenso comunicazioni"]),
    ...(clients.data ?? []).map((c) => {
      const s = byId.get(c.id ?? "");
      return csvRow([
        c.name,
        c.phone,
        c.email,
        c.note,
        csvDate(c.created_at ? romeDate(new Date(c.created_at)) : null),
        s?.visits ?? 0,
        csvDate(s?.last_visit_at ? romeDate(new Date(s.last_visit_at)) : null),
        csvEuros(Number(s?.spent_cents ?? 0)),
        c.marketing_opt_in ? "Sì" : "No",
      ]);
    }),
  ];
  const today = romeDate(new Date());
  return download(csvFile(rows), csvFileName(`clienti-${salon.slug}`, today));
}

/** Un cliente: i suoi dati e lo storico degli appuntamenti. Solo titolare. */
export async function exportOneClient(id: string) {
  const { role, salon } = await requireSalon();
  if (role !== "owner") return forbidden();
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clients_visible")
    .select("id, name, phone, email, note, created_at, marketing_opt_in")
    .eq("id", id)
    .eq("salon_id", salon.id)
    .maybeSingle();
  if (!c) return new Response("Cliente non trovato.", { status: 404 });
  const { data: appts } = await supabase
    .from("appointments")
    .select("starts_at, service_name, price_cents, status, member:members(name)")
    .eq("client_id", id)
    .eq("salon_id", salon.id)
    .order("starts_at", { ascending: false });

  const rows = [
    csvRow(["Nome", "Telefono", "Email", "Note", "Cliente dal", "Consenso comunicazioni"]),
    csvRow([c.name, c.phone, c.email, c.note, csvDate(c.created_at ? romeDate(new Date(c.created_at)) : null), c.marketing_opt_in ? "Sì" : "No"]),
    "",
    csvRow(["Data", "Servizio", "Barbiere", "Prezzo (€)", "Stato"]),
    ...(appts ?? []).map((a) => csvRow([csvDate(romeDate(new Date(a.starts_at))), a.service_name, a.member?.name ?? "", csvEuros(a.price_cents), STATUS[a.status] ?? a.status])),
  ];
  return download(csvFile(rows), csvFileName(c.name ?? "cliente", romeDate(new Date())));
}
