// Carica nel bucket `salon-photos` le quattro foto del salone demo (le righe sono già in supabase/seed.sql).
// Si usa dopo `supabase db reset`: `npm run db:reset` lo fa da solo. Serve la chiave di servizio, solo in locale.
import { readFile } from "node:fs/promises";

try {
  process.loadEnvFile(".env.local");
} catch {
  // le variabili possono arrivare dall'ambiente
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY: foto demo non caricate.");
  process.exit(1);
}

const SALON = "5a100000-0000-4000-8000-000000000001";
for (const name of ["hero", "cambia-taglio", "cambia-macchinetta", "cambia-schiuma"]) {
  const file = await readFile(new URL(`../public/images/foto/${name}.jpg`, import.meta.url));
  const res = await fetch(`${url}/storage/v1/object/salon-photos/${SALON}/${name}.jpg`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: file,
  });
  if (!res.ok) {
    console.error(`${name}: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
}
console.log("Foto demo caricate.");
