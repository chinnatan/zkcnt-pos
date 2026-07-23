/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
} from "workbox-precaching";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { cacheNames, clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { NavigationRoute, registerRoute, setCatchHandler } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>zKCNT POS</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f9fafb; color: #111827; }
    main { text-align: center; padding: 2rem; max-width: 24rem; }
    h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
    p { margin: 0; line-height: 1.5; color: #4b5563; }
  </style>
</head>
<body>
  <main>
    <h1>ยังเปิดแอปออฟไลน์ไม่ได้</h1>
    <p>กรุณาเชื่อมต่ออินเทอร์เน็ต เปิดแอปค้างไว้สัก 20 วินาที แล้วลองออฟไลน์อีกครั้ง</p>
  </main>
</body>
</html>`;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();
self.skipWaiting();

async function serveAppShell(): Promise<Response> {
  const candidates = [
    "/",
    "/index.html",
    "/pos/",
    "/pos/index.html",
    "/login/",
    "/login/index.html",
  ];

  for (const url of candidates) {
    const response = await matchPrecache(url);
    if (response) return response;
  }

  try {
    const cache = await caches.open(cacheNames.precache);
    for (const request of await cache.keys()) {
      const pathname = new URL(request.url).pathname;
      if (pathname.endsWith(".html") || pathname.endsWith("/")) {
        const response = await cache.match(request);
        if (response) return response;
      }
    }
  } catch {
    // Ignore cache read errors and fall through to inline HTML.
  }

  return new Response(OFFLINE_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function isHtmlResponse(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").includes("text/html");
}

registerRoute(
  ({ url }) => url.pathname.startsWith("/_nuxt/") || url.pathname.startsWith("/_i18n/"),
  async ({ request }) => {
    try {
      const response = await fetch(request);
      if (response.ok && !isHtmlResponse(response)) {
        return response;
      }
    } catch {
      // Fall through to error so the browser can surface a real load failure.
    }
    return Response.error();
  },
  "GET",
);

registerRoute(
  new NavigationRoute(
    async ({ request }) => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          return response;
        }
      } catch {
        // Offline — serve precached app shell.
      }
      return serveAppShell();
    },
    {
      denylist: [/^\/api/, /^\/uploads/, /^\/_nuxt/, /^\/_i18n/],
    },
  ),
);

setCatchHandler(async ({ request }) => {
  if (request.mode === "navigate") {
    return serveAppShell();
  }
  return Response.error();
});

registerRoute(
  /^https?:\/\/.*\/api\/.*/i,
  new NetworkFirst({
    cacheName: "api-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 }),
    ],
  }),
  "GET",
);

registerRoute(
  /^https?:\/\/.*\/uploads\/.*/i,
  new NetworkFirst({
    cacheName: "uploads-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 604800 }),
    ],
  }),
  "GET",
);
