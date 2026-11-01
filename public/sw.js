const CACHE_NAME = "novascents-offline-v2";
const REQUIRED_FILES = [
  "/",
  "/manifest.json",
  "/productos.json",
  "/precache-assets.json",
  "/icons/novascents-192.png",
  "/icons/novascents-512.png",
  "/icons/apple-touch-icon.png",
  "/catalog-images/placeholder.svg",
];

async function addAvailable(cache, urls) {
  await Promise.allSettled([...new Set(urls)].map((url) => cache.add(url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await addAvailable(cache, REQUIRED_FILES);

    try {
      const assets = await fetch("/precache-assets.json").then((response) => response.ok ? response.json() : []);
      await addAvailable(cache, assets);
    } catch { /* La lista de build no está disponible en modo de desarrollo. */ }

    // Precarga los recursos compilados del sitio (JS y CSS con nombre versionado).
    try {
      const page = await fetch("/", { cache: "reload" });
      const html = await page.clone().text();
      const assets = [...html.matchAll(/(?:src|href)=["']([^"']*\/assets\/[^"']+)["']/g)].map((match) => new URL(match[1], self.location.origin).href);
      await addAvailable(cache, assets);
    } catch { /* La app conserva su shell anterior si la red falla durante la actualización. */ }

    // Las imágenes de stock y una pequeña muestra de cada categoría quedan disponibles sin conexión.
    try {
      const response = await fetch("/productos.json");
      if (response.ok) {
        const products = await response.json();
        const mainProducts = [
          ...products.filter((product) => product.disponible),
          ...products.filter((product) => product.genero === "Hombre").slice(0, 4),
          ...products.filter((product) => product.genero === "Mujer").slice(0, 4),
          ...products.filter((product) => product.linea === "Árabe").slice(0, 4),
        ];
        await addAvailable(cache, mainProducts.map((product) => product.imagen).filter(Boolean));
      }
    } catch { /* En Vite dev o sin JSON disponible, se continúa con el shell esencial. */ }

    await self.skipWaiting();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SHOW_CART_REMINDER") return;
  event.waitUntil(self.registration.showNotification("NovaScents", {
    body: "Tus fragancias te esperan en NovaScents",
    icon: "/icons/novascents-192.png",
    badge: "/icons/novascents-192.png",
    tag: "novascents-cart-reminder",
    data: { url: "/#inicio" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const client = clients.find((item) => "focus" in item);
    return client ? client.focus() : self.clients.openWindow(event.notification.data?.url || "/");
  }));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("novascents-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const isStatic = request.destination === "image" || request.destination === "style" || request.destination === "script" || request.destination === "worker" || new URL(request.url).pathname === "/productos.json";
    if (cached && isStatic) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      if (cached) return cached;
      if (request.mode === "navigate") return (await caches.match("/")) || Response.error();
      return Response.error();
    }
  })());
});
