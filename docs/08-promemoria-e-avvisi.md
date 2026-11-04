# Promemoria e avvisi (Fase 5)

## Come partono
- **Subito:** conferma (F2), annullamento (F4), spostamento (F6) al cliente; avviso di nuova prenotazione e di annullamento al barbiere.
- **Ogni ora:** il database (pg_cron + pg_net) chiama `POST /api/cron/run` con `Authorization: Bearer <CRON_SECRET>`.
  - dalle 8:00 alle 10:59 di Roma partono i **riepiloghi** (una volta al giorno per operatore, tabella `summary_runs`);
  - dalle 18:00 alle 20:59 di Roma partono i **promemoria** del giorno dopo (una volta per appuntamento, colonna `reminder_sent_at`).
  - Se un passaggio salta, quelli dopo recuperano. I segni evitano i doppioni.
- Si può lanciare un lavoro a mano, con il segreto: `/api/cron/run?job=reminders` oppure `?job=summaries`.

## Impostazione sul progetto online
La pianificazione vive nel database, non nel codice:

```sql
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.schedule('taglendo-orario', '0 * * * *', $$select net.http_post(
  url := 'https://taglendo.it/api/cron/run',
  headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
  body := '{}'::jsonb, timeout_milliseconds := 55000)$$);
```

Se si cambia `CRON_SECRET` su Vercel, va rifatto `cron.schedule` con il nuovo valore.

## Variabili d'ambiente
`RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
Le chiavi VAPID si generano con `npx web-push generate-vapid-keys`. La pubblica deve nascere dalla privata: `GET /api/cron/run?job=none` risponde `push: "ok"` se coincidono.

## Scelte
- Con l'avviso "Notifica" e nessun dispositivo attivato, l'avviso ripiega sull'**email**, così non si perde.
- Gli operatori ricevono solo i propri appuntamenti; il titolare tutti, salvo "Solo i miei appuntamenti".
- L'email di spostamento (F6) segue la scelta "Prenotazione confermata"; quella di annullamento dal salone (F4) segue "Appuntamento annullato".
- Il riepilogo non parte se per quel giorno non ci sono appuntamenti.
- Su iPhone le notifiche funzionano solo con l'app aggiunta alla schermata Home (iOS 16.4 o successivi).
