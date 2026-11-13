/** Un salone pronto da mostrare nell'elenco: i testi (distanza, prezzi, orari) sono già scritti dal server. */
export type SalonView = {
  slug: string;
  name: string;
  where: string; // «Porta Saragozza · Bologna» oppure l'indirizzo
  lat: number;
  lng: number;
  coverUrl: string | null;
  logoUrl: string | null;
  distance: string; // «a 600 m»
  price: string | null; // «da 12 €»
  services: Array<{ name: string; duration: string; price: string | null }>;
  slotDay: string | null; // «Oggi», «Domani», «Ven 13 nov»: il giorno del primo orario
  slots: Array<{ time: string; day: string | null }>; // day solo se diverso dal primo
  bookingOnline: boolean;
};
