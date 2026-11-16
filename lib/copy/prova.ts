import { company } from "@/lib/site";

/** Gli avvisi sulla prova, dentro il gestionale del salone. */
export const provaCopy = {
  email: company.email,
  ended: {
    title: "Prova terminata",
    text: "Puoi consultare gli appuntamenti già fissati, ma non puoi aggiungerne altri e la tua pagina online non è più visibile. Per maggiori informazioni sul rinnovo invia un'email a",
  },
  ending: {
    title: (days: number) => (days <= 0 ? "La tua prova scade oggi" : days === 1 ? "La tua prova scade domani" : `La tua prova scade tra ${days} giorni`),
    text: (date: string) => `La prova finisce il ${date}: dopo potrai solo consultare l'agenda e la tua pagina online non sarà più visibile. Per maggiori informazioni sul rinnovo invia un'email a`,
  },
} as const;
