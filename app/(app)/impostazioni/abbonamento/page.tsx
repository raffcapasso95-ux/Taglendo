import { redirect } from "next/navigation";
import { Placeholder } from "@/components/Placeholder";
import { billingEnabled } from "@/lib/billing";

export default function Page() {
  // Durante la beta gratuita non c'è nessun abbonamento da gestire: la rotta non porta a una pagina vuota.
  if (!billingEnabled()) redirect("/impostazioni");
  return <Placeholder title="Abbonamento" phase="Fase 6" design="B1, B2, B5, B6" />;
}
