// Service Worker - cache offline
const CACHE = "araca-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./src/styles.css",
  "./src/data.jsx",
  "./src/components.jsx",
  "./src/fichas.jsx",
  "./src/auditoria.jsx",
  "./src/gerador.jsx",
  "./src/insumos.jsx",
  "./src/app.jsx",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Não cacheia chamadas externas (Gemini, Supabase, CDNs)
  const url = new URL(e.request.url);
  if (url.hostname === "generativelanguage.googleapis.com" || url.hostname === "unpkg.com" || url.hostname.endsWith(".supabase.co")) return;

  e.respondWith(
    caches.match(e.request).then((r) =>
      r || fetch(e.request).then((resp) => {
        if (resp.ok && url.origin === location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
