import { afterEach, describe, expect, it, vi } from "vitest";
import { checkGateLogin, gateEnabled, isOpenPath, safeEqual, signGateToken, verifyGateToken } from "./gate";

const SECRET = "un-segreto-lungo-di-prova-0123456789";

describe("token del cancello", () => {
  it("un token appena firmato vale", async () => {
    expect(await verifyGateToken(await signGateToken(SECRET), SECRET)).toBe(true);
  });
  it("scade dopo 30 giorni, non prima", async () => {
    const t0 = Date.UTC(2026, 10, 5);
    const token = await signGateToken(SECRET, t0);
    expect(await verifyGateToken(token, SECRET, t0 + 29 * 86400_000)).toBe(true);
    expect(await verifyGateToken(token, SECRET, t0 + 30 * 86400_000 + 1000)).toBe(false);
  });
  it("con un altro segreto, modificato o malformato non vale", async () => {
    const token = await signGateToken(SECRET);
    expect(await verifyGateToken(token, "altro-segreto")).toBe(false);
    const [exp, sig] = token.split(".");
    expect(await verifyGateToken(`${Number(exp) + 99999}.${sig}`, SECRET)).toBe(false); // scadenza allungata a mano
    expect(await verifyGateToken(`${exp}.${sig}x`, SECRET)).toBe(false);
    for (const bad of [undefined, "", "abc", "1.2.3", ".x", "x."]) expect(await verifyGateToken(bad, SECRET)).toBe(false);
  });
  it("senza segreto configurato non vale nulla", async () => {
    expect(await verifyGateToken(await signGateToken(SECRET), undefined)).toBe(false);
  });
});

describe("safeEqual", () => {
  it("confronta testi di qualunque lunghezza", async () => {
    expect(await safeEqual("abc", "abc")).toBe(true);
    expect(await safeEqual("abc", "abd")).toBe(false);
    expect(await safeEqual("abc", "abcd")).toBe(false);
    expect(await safeEqual("", "")).toBe(true);
  });
});

describe("accesso con utente e password", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("entra solo con utente e password giusti (l'utente senza badare alle maiuscole)", async () => {
    vi.stubEnv("PREVIEW_USER", "Raffaele");
    vi.stubEnv("PREVIEW_PASSWORD", "Pass-giusta-9!");
    vi.stubEnv("PREVIEW_SECRET", SECRET);
    expect(await checkGateLogin("raffaele", "Pass-giusta-9!")).toBe(true);
    expect(await checkGateLogin(" RAFFAELE ", "Pass-giusta-9!")).toBe(true);
    expect(await checkGateLogin("raffaele", "pass-giusta-9!")).toBe(false);
    expect(await checkGateLogin("altro", "Pass-giusta-9!")).toBe(false);
    expect(await checkGateLogin("", "")).toBe(false);
  });
  it("se mancano utente, password o segreto non entra nessuno", async () => {
    vi.stubEnv("PREVIEW_USER", "");
    vi.stubEnv("PREVIEW_PASSWORD", "");
    vi.stubEnv("PREVIEW_SECRET", "");
    expect(await checkGateLogin("", "")).toBe(false);
    vi.stubEnv("PREVIEW_USER", "a");
    vi.stubEnv("PREVIEW_PASSWORD", "b");
    expect(await checkGateLogin("a", "b")).toBe(false); // manca il segreto
  });
});

describe("cancello acceso o spento", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("è spento di default e si accende solo con SITE_PRIVATE=true", () => {
    vi.stubEnv("SITE_PRIVATE", "");
    expect(gateEnabled()).toBe(false);
    vi.stubEnv("SITE_PRIVATE", "false");
    expect(gateEnabled()).toBe(false);
    vi.stubEnv("SITE_PRIVATE", "true");
    expect(gateEnabled()).toBe(true);
  });
  it("restano aperti la pagina «a breve», l'accesso, il cron e il webhook dei pagamenti, non il resto", () => {
    for (const p of ["/a-breve", "/accesso-riservato", "/api/cron/run", "/api/stripe/webhook", "/robots.txt"]) expect(isOpenPath(p)).toBe(true);
    for (const p of ["/", "/accedi", "/agenda", "/barberia-saragozza", "/api/session", "/a-breve-fake", "/api/cronaca"]) expect(isOpenPath(p)).toBe(false);
  });
});
