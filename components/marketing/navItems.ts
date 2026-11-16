import { saloniCopy } from "@/lib/copy/saloni";
import { searchCopy } from "@/lib/copy/search";

/** Una voce del menu: una sezione della stessa pagina, un'altra pagina, o un servizio da cercare. */
export type NavItem = {
  label: string;
  /** Indirizzo completo; per le sezioni è `/per-i-saloni#id` (nella pagina stessa diventa `#id`). */
  href: string;
  kind: "section" | "page" | "service";
  /** Per le sezioni: l'id dell'elemento nella pagina. */
  id?: string;
};

export const SALONI = "/per-i-saloni";
const nav = saloniCopy.nav;

/**
 * Il menu per i saloni, uguale nella home e in Funzioni: prima le sezioni della home (si scorre), per ultima l'altra pagina (si cambia pagina,
 * e la voce lo dice con una freccia). Così ogni voce fa quello che sembra.
 */
export const SALONI_NAV: NavItem[] = [
  { label: nav.how, href: `${SALONI}#come`, kind: "section", id: "come" },
  { label: nav.cost, href: `${SALONI}#costo`, kind: "section", id: "costo" },
  { label: nav.faq, href: `${SALONI}#domande`, kind: "section", id: "domande" },
  { label: nav.features, href: `${SALONI}/funzioni`, kind: "page" },
];

/** I servizi più cercati: ognuno apre la ricerca già scelta. */
export const CLIENTI_NAV: NavItem[] = searchCopy.site.services.map((v) => ({ label: v.name, href: `/cerca?servizio=${encodeURIComponent(v.query)}`, kind: "service" }));

/** Dove finisce l'ultima sezione del menu: da qui in poi nessuna voce è «in vista». */
export const SALONI_END_ID = "inizia";
