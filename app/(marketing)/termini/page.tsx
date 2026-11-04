import type { Metadata } from "next";
import { LegalPage, List, P } from "@/components/marketing/LegalPage";
import { billingEnabled } from "@/lib/billing";
import { company } from "@/lib/site";

export const metadata: Metadata = { title: "Termini di servizio · Taglendo", description: "Le condizioni per i barbieri che usano Taglendo.", alternates: { canonical: "/termini" } };

/** G4 · Termini di servizio. Bozza: il testo finale lo scrive o lo verifica un consulente legale. */
export default function Page() {
  const live = billingEnabled();
  return (
    <LegalPage
      title="Termini di servizio"
      lead="Questi termini valgono tra Taglendo e chi usa l’app per gestire una barberia. I clienti che prenotano non hanno un contratto con Taglendo."
      sections={[
        {
          id: "servizio",
          title: "Il servizio",
          body: <P>Taglendo offre agenda, pagina di prenotazione e promemoria per barberie da 1 a 3 poltrone. Non è un marketplace: ogni salone ha la sua pagina e i suoi clienti.</P>,
        },
        {
          id: "abbonamento",
          title: "Prova e abbonamento",
          body: live ? (
            <List
              items={[
                "Prova gratuita di 15 giorni con tutte le funzioni, senza carta.",
                "Piano Solo: 1 poltrona, 9,90 € al mese + IVA. Piano Salone: fino a 3 poltrone, 19,90 € al mese + IVA.",
                "Nessuna commissione sulle prenotazioni.",
              ]}
            />
          ) : (
            <>
              <P>Durante la beta Taglendo è gratuito, con tutte le funzioni e senza carta di credito. Sulle prenotazioni non ci sono commissioni.</P>
              <P>Quando partiranno gli abbonamenti ti avvisiamo con largo anticipo e hai 15 giorni di prova con tutte le funzioni prima di scegliere se continuare.</P>
            </>
          ),
        },
        {
          id: "pagamenti",
          title: "Pagamenti e fatture",
          body: live ? (
            <P>Addebito mensile anticipato con carta. Fattura elettronica via email. Se un pagamento non va a buon fine hai 7 giorni per aggiornare la carta; poi le prenotazioni online vengono sospese, i dati restano.</P>
          ) : (
            <P>Durante la beta non c’è nessun pagamento e non emettiamo fatture. Quando gli abbonamenti partiranno, l’addebito sarà mensile anticipato con carta e la fattura elettronica arriverà via email.</P>
          ),
        },
        {
          id: "disdetta",
          title: "Disdetta",
          body: <P>Disdici quando vuoi dalle impostazioni. Il piano resta attivo fino alla fine del mese pagato; dopo, agenda e clienti restano consultabili ed esportabili per 12 mesi.</P>,
        },
        {
          id: "dati",
          title: "Dati dei clienti",
          body: (
            <P>I dati dei clienti del salone restano del salone, che ne è il titolare: Taglendo li tratta per suo conto, solo per far funzionare il servizio, come spiegato nell’informativa privacy. Il salone è responsabile di avere il diritto di inserirli e di rispondere alle richieste dei suoi clienti.</P>
          ),
        },
        {
          id: "responsabilita",
          title: "Responsabilità",
          body: (
            <P>Facciamo il possibile perché il servizio sia sempre disponibile e i promemoria partano, ma non possiamo garantire l’assenza di interruzioni. Per le email e le notifiche dipendiamo anche da fornitori esterni. Rimane responsabilità del salone controllare la propria agenda.</P>
          ),
        },
        {
          id: "legge",
          title: "Legge e foro",
          body: (
            <P>
              Questi termini sono regolati dalla legge italiana. Per ogni controversia è competente il foro del luogo in cui ha sede Taglendo, salvo diversa norma inderogabile a tutela del consumatore. Per domande: <a href={`mailto:${company.email}`}>{company.email}</a>.
            </P>
          ),
        },
      ]}
    />
  );
}
