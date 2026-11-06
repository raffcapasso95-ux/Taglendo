import { describe, expect, it } from "vitest";
import { avatarColor, clientInitials, colorFromName } from "./avatar";

describe("avatar del cliente", () => {
  it("le iniziali sono le prime due parole", () => {
    expect(clientInitials("Alessio Ricci")).toBe("AR");
    expect(clientInitials("Marco")).toBe("M");
    expect(clientInitials("  anna  maria  rossi ")).toBe("AM");
    expect(clientInitials("Élodie Dubois")).toBe("ÉD");
    expect(clientInitials("")).toBe("?");
  });

  it("il colore ricavato dal nome è sempre lo stesso e sta fra 0 e 4", () => {
    const names = ["Alessio Ricci", "Antonio Esposito", "Davide Ferri", "Luca", "Giorgio Conti", "Zoë"];
    for (const n of names) {
      const c = colorFromName(n);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(4);
      expect(colorFromName(n)).toBe(c);
    }
    expect(colorFromName("Alessio Ricci")).toBe(colorFromName("  alessio ricci "));
    expect(colorFromName("José")).toBe(colorFromName("Jose"));
  });

  it("il colore scelto dal salone vince su quello del nome", () => {
    expect(avatarColor("Alessio Ricci", 4)).toBe(4);
    expect(avatarColor("Alessio Ricci", 0)).toBe(0);
    expect(avatarColor("Alessio Ricci", null)).toBe(colorFromName("Alessio Ricci"));
    expect(avatarColor("Alessio Ricci", 9)).toBe(colorFromName("Alessio Ricci"));
  });
});
