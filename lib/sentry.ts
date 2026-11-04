/** Opzioni comuni di Sentry. Senza DSN non parte nulla: il codice resta spento. */
export const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryOptions = {
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn) && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // dati personali (IP, cookie, email) non si mandano
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
};
