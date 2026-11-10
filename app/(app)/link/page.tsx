import { redirect } from "next/navigation";

/** Il vecchio «Link di prenotazione» ora è la sezione «Salone». */
export default function Page() {
  redirect("/salone");
}
