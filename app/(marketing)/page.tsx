import { redirect } from "next/navigation";

/** Finché il sito commerciale (Fase 7) non c'è, chi arriva qui va all'accesso: chi è già dentro finisce in agenda. */
export default function Page() {
  redirect("/accedi");
}
