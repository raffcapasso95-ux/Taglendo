/*
 * Taglendo: notifiche sul telefono e uso senza rete.
 * - notifiche: riceve gli avvisi del salone e apre l'agenda quando li si tocca;
 * - offline (solo se registrato con ?cache=1, cioè in produzione): tiene i file dell'app e l'ultima agenda vista,
 *   così senza rete si apre l'agenda salvata. Esce da qui con "Esci": l'app cancella la cache "tg-pages".
 */
const STATIC = "tg-static-v1";
const PAGES = "tg-pages";
const OFFLINE_URL = "/offline.html";
const CACHING = new URL(self.location.href).searchParams.get("cache") === "1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  if (CACHING) event.waitUntil(caches.open(STATIC).then((c) => c.add(OFFLINE_URL)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, PAGES]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (!CACHING) return;
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // File dell'app con il nome che cambia a ogni versione: si prendono dalla cache e basta.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Pagine: con la rete si prende quella nuova e si tiene l'ultima agenda; senza rete si mostra quella.
  if (request.mode === "navigate") {
    const isAgenda = url.pathname === "/agenda" || url.pathname.startsWith("/agenda/");
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok && !res.redirected && isAgenda) {
            const cache = await caches.open(PAGES);
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          const cached = (await caches.match(request)) || (isAgenda ? await caches.match("/agenda") : undefined);
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Taglendo", body: "", url: "/agenda" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // messaggio senza JSON: si mostra quello che c'è
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: { url: data.url },
      tag: data.tag,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/agenda", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
