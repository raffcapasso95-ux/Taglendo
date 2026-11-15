import type { PublicSalon } from "@/lib/public/load";
import { dayFromRanges, CLOSED_DAY } from "@/lib/rules/hours";

/** «Barberia Porta Nuova»: il salone d'esempio della home dei saloni e di Funzioni (dati fissi, non vengono dal database). */
const split = dayFromRanges({ closed: false, ranges: [[540, 780], [870, 1170]] });
const saturday = dayFromRanges({ closed: false, ranges: [[540, 1170]] });

export const DEMO_SALON: PublicSalon = {
  id: "demo",
  slug: "barberia-porta-nuova",
  name: "Barberia Porta Nuova",
  address: "Via Roma 77, Torino",
  area: "Porta Nuova · Torino",
  city: "Torino",
  phone: "011 562 3390",
  description: "Tagli classici, sfumature e barba col panno caldo. Dal 2014 a due passi dalla stazione.",
  instagram: null,
  coverPath: null,
  logoUrl: "/images/logo-porta-nuova.svg",
  bookingOnline: true,
  cancelOnline: true,
  showPrices: true,
  cancelLimitMin: 120,
  minNoticeMin: 120,
  maxAdvanceDays: 30,
  access: { sub_status: "active", trial_ends_at: "2099-01-01T00:00:00Z" },
  services: [
    { id: "s1", name: "Taglio uomo", durationMin: 30, priceCents: 2000 },
    { id: "s2", name: "Barba", durationMin: 20, priceCents: 1200 },
    { id: "s3", name: "Taglio e barba", durationMin: 50, priceCents: 3000 },
    { id: "s4", name: "Taglio bambino", durationMin: 25, priceCents: 1500 },
  ],
  members: [
    { id: "m1", name: "Chiara", bio: "Sfumature e tagli corti", photoPath: null, chairNo: 1 },
    { id: "m2", name: "Fabio", bio: "Barba e rasatura classica", photoPath: null, chairNo: 2 },
    { id: "m3", name: "Kevin", bio: "Tagli lunghi e bambini", photoPath: null, chairNo: 3 },
  ],
  photos: ["/images/foto/barbiere-sfumatura.jpg", "/images/foto/nuca-sfumatura.jpg", "/images/foto/barba.jpg", "/images/foto/poltrona.jpg", "/images/foto/hero.jpg"],
  // domenica e lunedì chiuso; martedì–venerdì con la pausa; sabato continuato
  week: [CLOSED_DAY, CLOSED_DAY, split, split, split, split, saturday],
  know: {
    specialties: "Sfumature, barba con panno caldo, rasatura a mano libera",
    paymentMethods: ["contanti", "carta", "bancomat"],
    products: "Proraso, Reuzel",
    kidsUntil: 12,
    stepFreeAccess: true,
    accessNote: "3 min dalla stazione",
  },
};
