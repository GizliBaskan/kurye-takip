// Motokurye Takip - basit service worker
// Amaç: uygulama kabuğunu (index.html) cache'leyip offline açılabilmesini sağlamak.
// Firebase verileri (kayıtlar, giriş vs.) yine internet gerektirir; bu sadece
// uygulamanın beyaz ekran yerine açılmasını garanti eder.

const CACHE_NAME = "kurye-takip-cache-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Sadece GET isteklerini ve kendi origin'imizi cache'liyoruz.
  // Firebase/CDN istekleri her zaman ağdan gider (offline'da veri zaten senkron olamaz).
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
