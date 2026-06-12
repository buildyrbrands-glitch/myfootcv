/* ═══════════════════════════════════════════════════════════
   MYFOOTCV — SERVICE WORKER
   Cache stratégique pour mode hors-ligne + perf
   ═══════════════════════════════════════════════════════════ */

const CACHE_VERSION = "myfootcv-v3";
const STATIC_CACHE = CACHE_VERSION + "-static";
const RUNTIME_CACHE = CACHE_VERSION + "-runtime";

// Assets statiques à pré-cacher au moment de l'installation
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/admin.html",
  "/terms.html",
  "/privacy.html",
  "/legal.html",
  "/legal.css",
  "/supabase-client.js",
  "/auth-modal.js",
  "/logo.png",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json"
];

// Domaines externes à cacher en runtime
const RUNTIME_ALLOWED = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "flagcdn.com",
  "upload.wikimedia.org"
];

// ─── Install ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache les assets un par un, on ignore les erreurs
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn("SW: failed to cache", url, err.message))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate (cleanup old caches) ────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch handler ────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Skip non-GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Skip Supabase API (must always go to network)
  if (url.hostname.includes("supabase.co") || url.hostname.includes("supabase.com")) {
    return; // let browser handle
  }

  // HTML navigation → network first, cache fallback
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  // Static assets → cache first, network fallback
  const isStatic = STATIC_ASSETS.some(p => url.pathname === p || url.pathname === p.replace(/^\//, ""));
  const isAllowedExternal = RUNTIME_ALLOWED.some(d => url.hostname.includes(d));

  if (isStatic || isAllowedExternal) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok && (isStatic || isAllowedExternal)) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Everything else → network only (no caching)
});

// ─── Message handler (pour update auto) ──────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
