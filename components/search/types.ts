/** Un salone pronto da mostrare nell'elenco: i testi (distanza, prezzo, primo orario) sono già scritti dal server. */
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
  services: string[];
  slot: string | null; // «Primo orario: oggi alle 15:30»
  bookingOnline: boolean;
};
