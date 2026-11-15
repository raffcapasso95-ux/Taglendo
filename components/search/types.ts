/** Un salone pronto da mostrare nell'elenco e sulla mappa: i testi (distanza, prezzi, orari) sono già scritti dal server. */
export type SalonView = {
  slug: string;
  name: string;
  where: string; // indirizzo, o la zona
  lat: number;
  lng: number;
  coverUrl: string | null;
  logoUrl: string | null;
  distance: string; // «600 m», «1,2 km»
  services: Array<{ name: string; price: string | null }>;
  slotDay: string | null; // «Oggi», «Domani», «Ven 13 nov»: il giorno del primo orario
  slots: Array<{ time: string; day: string | null }>; // day solo se diverso dal primo
  /** L'etichetta sulla mappa: il primo orario libero («17:30», «dom 9:00»), e se è oggi. */
  pin: { text: string; today: boolean } | null;
  bookingOnline: boolean;
  open: boolean;
  /** «19:30»: quando chiude la fascia in corso (solo se aperto). */
  closes: string | null;
  isNew: boolean;
  barbers: number;
};
