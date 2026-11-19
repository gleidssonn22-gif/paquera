const CACHE_NAME = "paquera-v2";
const PRECACHE = [
  "/",
  "/index.html",
  "/entrar.html",
  "/cadastro.html",
  "/css/style.css",
  "/js/app.js",
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.svg",
  "/icon-512.svg"
];
const OFFLINE_URL = "/index.html";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || e.request.url.includes("/api/")) return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  const isHTML = url.pathname === "/" || url.pathname.endsWith(".html");

  if (isHTML) {
    // NETWORK-FIRST para navegações/HTML: nunca serve HTML antigo se a rede responde,
    // evitando travar versões após deploy. Cache só entra como fallback offline.
    e.respondWith((async () => {
      try {
        const r = await fetch(e.request);
        if (r && r.ok) {
          const cl = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, cl)).catch(() => {});
        }
        return r || new Response("Service Unavailable", { status: 503 });
      } catch (err) {
        const cached = await caches.match(e.request);
        const offline = await caches.match(OFFLINE_URL);
        return cached || offline || new Response(
          "<!DOCTYPE html><html lang=\"pt-BR\"><meta charset=\"UTF-8\"><title>Offline — Paquera</title><body style=\"font-family:sans-serif;text-align:center;padding:60px 20px;\"><h1>Você está offline 💕</h1><p>Reconecte para usar o Paquera.</p></body></html>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    })());
    return;
  }

  // STALE-WHILE-REVALIDATE para demais assets (CSS/JS/imagens/fontes/manifest).
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) {
      // Atualiza o cache em segundo plano; sempre devolve um Response (nunca undefined).
      e.waitUntil(fetch(e.request).then(r => {
        if (r && r.ok) return caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone()));
      }).catch(() => {}));
      return cached;
    }
    try {
      const r = await fetch(e.request);
      if (r && r.ok) {
        const cl = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, cl)).catch(() => {});
      }
      return r || new Response("Service Unavailable", { status: 503 });
    } catch (err) {
      return new Response("Offline", { status: 503 });
    }
  })());
});
