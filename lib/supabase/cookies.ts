/**
 * "Ricordami": con la casella spenta la sessione vale finché si chiude il
 * browser (cookie senza scadenza); accesa, dura quanto dice Supabase
 * (30 giorni, vedi [auth.sessions] in supabase/config.toml).
 */
export const REMEMBER_COOKIE = "tg_remember";

type CookieOptions = {
  maxAge?: number;
  expires?: Date;
  [key: string]: unknown;
};

export function withRemember<T extends CookieOptions>(options: T | undefined, remember: boolean): T | undefined {
  if (remember || !options) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  void _maxAge;
  void _expires;
  return rest as T;
}
