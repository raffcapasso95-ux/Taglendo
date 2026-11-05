/**
 * Cancello d'accesso al sito (modalità «a breve online»).
 *
 * Con SITE_PRIVATE=true chi non ha il permesso vede solo la pagina /a-breve.
 * Il permesso è un cookie firmato (HMAC) che si ottiene da /accesso-riservato con utente e password
 * scelti nelle variabili d'ambiente. Usa solo Web Crypto: gira sia nel proxy sia nelle azioni del server.
 */

export const GATE_COOKIE = "tg_preview";
export const GATE_DAYS = 30;

/** Il cancello è chiuso solo se lo si accende apposta. */
export const gateEnabled = () => process.env.SITE_PRIVATE === "true";

/** Percorsi che restano aperti a tutti anche con il cancello chiuso. */
const OPEN_PATHS = ["/a-breve", "/accesso-riservato", "/api/cron", "/api/stripe", "/robots.txt"];
export const isOpenPath = (path: string) => OPEN_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

const encoder = new TextEncoder();

const toB64Url = (bytes: Uint8Array) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toB64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message))));
}

/** Confronto a tempo costante di due testi (passa dagli hash, così anche la lunghezza non trapela). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(a)), crypto.subtle.digest("SHA-256", encoder.encode(b))]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

/** Token «scadenza.firma». */
export async function signGateToken(secret: string, now = Date.now(), days = GATE_DAYS): Promise<string> {
  const exp = String(Math.floor(now / 1000) + days * 86400);
  return `${exp}.${await hmac(exp, secret)}`;
}

export async function verifyGateToken(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [exp, sig, ...rest] = token.split(".");
  if (!exp || !sig || rest.length > 0 || !/^\d+$/.test(exp)) return false;
  if (Number(exp) * 1000 <= now) return false;
  return safeEqual(sig, await hmac(exp, secret));
}

/** Utente e password giusti? Se mancano nelle variabili d'ambiente non entra nessuno. */
export async function checkGateLogin(user: string, password: string): Promise<boolean> {
  const expectedUser = process.env.PREVIEW_USER;
  const expectedPassword = process.env.PREVIEW_PASSWORD;
  if (!expectedUser || !expectedPassword || !process.env.PREVIEW_SECRET) return false;
  // si controllano sempre entrambi, per non far capire quale dei due è sbagliato
  const [okUser, okPassword] = await Promise.all([safeEqual(user.trim().toLowerCase(), expectedUser.trim().toLowerCase()), safeEqual(password, expectedPassword)]);
  return okUser && okPassword;
}
