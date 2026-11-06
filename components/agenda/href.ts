/** Indirizzo dell'agenda di un giorno: oggi senza data, e il barbiere scelto se c'è. */
export const agendaHref = (date: string, today: string, operator: string | null) => {
  const q = new URLSearchParams();
  if (date !== today) q.set("g", date);
  if (operator) q.set("op", operator);
  const s = q.toString();
  return s ? `/agenda?${s}` : "/agenda";
};
