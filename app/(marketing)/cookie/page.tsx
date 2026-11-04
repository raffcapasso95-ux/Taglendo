import type { Metadata } from "next";
import { Field } from "@/components/marketing/SiteFooter";
import { LegalPage, P } from "@/components/marketing/LegalPage";
import styles from "@/components/marketing/Marketing.module.css";

export const metadata: Metadata = { title: "Cookie · Taglendo", description: "Quali cookie usiamo e come cambiare scelta.", alternates: { canonical: "/cookie" } };

const rows: Array<[string, string, string, string]> = [
  ["sb-…-auth-token", "Necessario", "Tiene aperto l’accesso al gestionale", "Fino a 30 giorni, o alla chiusura del browser se non scegli «Ricordami»"],
  ["tg_remember", "Necessario", "Ricorda se vuoi restare collegato", "Fino a 30 giorni, o alla chiusura del browser"],
  ["tg_cookie", "Necessario", "Ricorda la tua scelta sui cookie", "6 mesi"],
];

/** G5 · Cookie. Elenco dei cookie del sito e delle pagine dei saloni. */
export default function Page() {
  return (
    <LegalPage
      title="Cookie"
      lead="Usiamo pochi cookie: quelli necessari al funzionamento e, solo se accetti, quelli per le statistiche anonime."
      sections={[
        {
          id: "cosa-sono",
          title: "Cosa sono",
          body: <P>Piccoli file salvati dal browser. Servono a ricordare l’accesso, le scelte fatte e, se lo permetti, a contare le visite.</P>,
        },
        {
          id: "quali",
          title: "Quali usiamo",
          body: (
            <div className={styles.tableWrap} role="region" aria-label="Elenco dei cookie" tabIndex={0}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Scopo</th>
                    <th scope="col">Durata</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([name, type, purpose, duration]) => (
                    <tr key={name}>
                      <td><code>{name}</code></td>
                      <td>{type}</td>
                      <td>{purpose}</td>
                      <td>{duration}</td>
                    </tr>
                  ))}
                  <tr>
                    <td><Field value="[strumento statistiche]" /></td>
                    <td>Statistiche</td>
                    <td>Visite e pagine più viste, in forma anonima</td>
                    <td><Field value="[da definire]" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: "scelta",
          title: "Come cambiare scelta",
          body: <P>Usa «Preferenze cookie» in fondo a ogni pagina. Rifiutare le statistiche non cambia nulla nel funzionamento del sito.</P>,
        },
      ]}
    />
  );
}
