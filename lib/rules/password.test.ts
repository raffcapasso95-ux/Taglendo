import { describe, expect, it } from "vitest";
import { PASSWORD_LABELS, passwordLevel } from "./password";

describe("passwordLevel", () => {
  it("sotto 8 caratteri non ha etichetta", () => {
    expect(passwordLevel("")).toBe("short");
    expect(passwordLevel("Ab1!xyz")).toBe("short");
  });

  it("8 caratteri è il minimo accettato", () => {
    expect(passwordLevel("abcdefgh")).not.toBe("short");
  });

  it("un solo tipo di carattere è debole", () => {
    expect(passwordLevel("abcdefgh")).toBe("weak");
    expect(passwordLevel("12345678")).toBe("weak");
  });

  it("le password più comuni e le ripetizioni sono deboli anche se varie", () => {
    expect(passwordLevel("Password1")).toBe("weak");
    expect(passwordLevel("aaaaaaaaaaaaaaaa")).toBe("weak");
  });

  it("sale con la varietà e con la lunghezza", () => {
    expect(passwordLevel("Barbiere")).toBe("fair"); // maiuscole + minuscole
    expect(passwordLevel("barbiere7")).toBe("fair");
    expect(passwordLevel("Barbiere7")).toBe("good");
    expect(passwordLevel("Barbiere7!")).toBe("great");
    expect(passwordLevel("treparoleinfila")).toBe("fair"); // lunga ma solo minuscole
  });

  it("le etichette sono quelle approvate", () => {
    expect(PASSWORD_LABELS).toEqual({ weak: "Debole", fair: "Discreta", good: "Buona", great: "Ottima" });
  });
});
