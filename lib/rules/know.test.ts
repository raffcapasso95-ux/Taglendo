import { describe, expect, it } from "vitest";
import { parseKnow, type KnowInput } from "./know";

const base: KnowInput = { specialties: "", products: "", accessNote: "", paymentMethods: [], kidsUntil: "", stepFree: "" };

describe("«Da sapere» del salone", () => {
  it("i campi vuoti diventano null e non si salva niente di inventato", () => {
    expect(parseKnow(base)).toEqual({ ok: true, value: { specialties: null, products: null, access_note: null, payment_methods: [], kids_until: null, step_free_access: null } });
  });

  it("pulisce gli spazi, ordina i pagamenti, scarta quelli sconosciuti", () => {
    const r = parseKnow({ ...base, specialties: "  Sfumature   e barba ", paymentMethods: ["carta", "assegni", "contanti"], kidsUntil: "12", stepFree: "si" });
    expect(r).toEqual({ ok: true, value: { specialties: "Sfumature e barba", products: null, access_note: null, payment_methods: ["contanti", "carta"], kids_until: 12, step_free_access: true } });
    expect(parseKnow({ ...base, stepFree: "no" })).toMatchObject({ value: { step_free_access: false } });
  });

  it("rifiuta testi troppo lunghi e un'età fuori misura", () => {
    expect(parseKnow({ ...base, specialties: "x".repeat(121) })).toEqual({ ok: false, field: "specialties" });
    expect(parseKnow({ ...base, products: "x".repeat(81) })).toEqual({ ok: false, field: "products" });
    expect(parseKnow({ ...base, accessNote: "x".repeat(61) })).toEqual({ ok: false, field: "accessNote" });
    for (const k of ["0", "18", "-3", "abc", "1.5"]) expect(parseKnow({ ...base, kidsUntil: k }), k).toEqual({ ok: false, field: "kidsUntil" });
  });
});
