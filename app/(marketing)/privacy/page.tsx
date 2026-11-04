import type { Metadata } from "next";
import { Field } from "@/components/marketing/SiteFooter";
import { LegalPage, List, P } from "@/components/marketing/LegalPage";
import { company } from "@/lib/site";

export const metadata: Metadata = { title: "Informativa privacy · Taglendo", description: "Quali dati trattiamo, perché, per quanto tempo e come esercitare i tuoi diritti.", alternates: { canonical: "/privacy" } };

/** G1 · Informativa privacy. Bozza: il testo finale lo scrive o lo verifica un consulente legale. */
export default function Page() {
  return (
    <LegalPage
      title="Informativa privacy"
      lead="Taglendo serve a due tipi di persone: i barbieri che usano l’app e i loro clienti che prenotano. Qui spieghiamo, per entrambi, quali dati trattiamo e perché."
      sections={[
        {
          id: "titolare",
          title: "Chi tratta i dati",
          body: (
            <>
              <P>Per i dati dei barbieri (account, salone, fatturazione) il titolare è Taglendo. Per i dati dei clienti che prenotano il titolare è il salone; Taglendo li tratta per suo conto, come responsabile del trattamento.</P>
              <P>Taglendo: <Field value={company.legalName} />, P.IVA <Field value={company.vat} />, sede legale <Field value={company.address} />.</P>
            </>
          ),
        },
        {
          id: "dati",
          title: "Quali dati",
          body: (
            <List
              items={[
                "Barbieri: nome, email, telefono del salone, dati di fatturazione.",
                "Clienti: nome, email, telefono se lo lasciano, storico degli appuntamenti, note del barbiere.",
                "Dati tecnici: indirizzo IP e registri di accesso, per sicurezza.",
              ]}
            />
          ),
        },
        {
          id: "perche",
          title: "Perché li usiamo",
          body: <P>Per far funzionare agenda e prenotazioni, mandare le email di servizio, fatturare l’abbonamento e proteggere gli account.</P>,
        },
        {
          id: "durata",
          title: "Per quanto tempo",
          body: (
            <List
              items={[
                "I dati dei clienti restano finché il salone li conserva: il salone può esportarli o eliminarli in ogni momento, e su richiesta del cliente.",
                "Se un cliente viene eliminato, i suoi appuntamenti passati restano nei totali del salone senza nome e quelli futuri vengono annullati.",
                "Se il salone chiude l’account, i dati vengono cancellati entro 30 giorni.",
                "I codici di conferma delle prenotazioni valgono 10 minuti e non si conservano oltre un giorno.",
              ]}
            />
          ),
        },
        {
          id: "destinatari",
          title: "A chi li comunichiamo",
          body: (
            <>
              <P>Solo a chi serve per far funzionare il servizio, come fornitori che trattano i dati per nostro conto:</P>
              <List
                items={[
                  "hosting e database (Vercel, Supabase), con i dati conservati nell’Unione Europea;",
                  "invio delle email di servizio (Resend);",
                  "pagamenti degli abbonamenti (Stripe), quando saranno attivi.",
                ]}
              />
              <P>Non vendiamo i dati e non li usiamo per pubblicità.</P>
            </>
          ),
        },
        {
          id: "diritti",
          title: "I tuoi diritti",
          body: (
            <>
              <P>Puoi chiedere di accedere ai tuoi dati, correggerli, cancellarli, limitarne l’uso, riceverli in un formato leggibile e opporti al trattamento. Se sei cliente di un salone, scrivi prima al salone; possiamo aiutarlo a rispondere.</P>
              <P>Hai anche il diritto di rivolgerti al Garante per la protezione dei dati personali.</P>
            </>
          ),
        },
        {
          id: "contatti",
          title: "Contatti",
          body: <P>Per ogni domanda sui dati scrivi a <a href={`mailto:${company.email}`}>{company.email}</a>.</P>,
        },
      ]}
    />
  );
}
