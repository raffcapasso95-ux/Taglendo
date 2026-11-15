/** «Da sapere» della pagina del salone: controllo dei campi scritti dal titolare. */
export const PAYMENTS = ["contanti", "carta", "bancomat", "satispay"] as const;
export type Payment = (typeof PAYMENTS)[number];

export type KnowInput = {
  specialties: string;
  products: string;
  accessNote: string;
  paymentMethods: string[];
  /** «» = non indicato */
  kidsUntil: string;
  stepFree: "" | "si" | "no";
};
export type KnowClean = {
  specialties: string | null;
  products: string | null;
  access_note: string | null;
  payment_methods: Payment[];
  kids_until: number | null;
  step_free_access: boolean | null;
};
export type KnowField = "specialties" | "products" | "accessNote" | "kidsUntil";

export const KNOW_LIMITS = { specialties: 120, products: 80, accessNote: 60 } as const;

export function parseKnow(input: KnowInput): { ok: true; value: KnowClean } | { ok: false; field: KnowField } {
  const text = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
  const specialties = text(input.specialties);
  const products = text(input.products);
  const accessNote = text(input.accessNote);
  if (specialties.length > KNOW_LIMITS.specialties) return { ok: false, field: "specialties" };
  if (products.length > KNOW_LIMITS.products) return { ok: false, field: "products" };
  if (accessNote.length > KNOW_LIMITS.accessNote) return { ok: false, field: "accessNote" };
  const kidsText = text(input.kidsUntil);
  let kids: number | null = null;
  if (kidsText !== "") {
    if (!/^\d{1,2}$/.test(kidsText) || Number(kidsText) < 1 || Number(kidsText) > 17) return { ok: false, field: "kidsUntil" };
    kids = Number(kidsText);
  }
  const methods = PAYMENTS.filter((p) => (input.paymentMethods ?? []).includes(p));
  return {
    ok: true,
    value: {
      specialties: specialties || null,
      products: products || null,
      access_note: accessNote || null,
      payment_methods: methods,
      kids_until: kids,
      step_free_access: input.stepFree === "si" ? true : input.stepFree === "no" ? false : null,
    },
  };
}
