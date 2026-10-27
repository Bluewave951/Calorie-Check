// Service worker แบบง่าย: เปิดแอปได้แม้เน็ตหลุด (ยกเว้นการวิเคราะห์รูปที่ต้องใช้ Ollama)
const CACHE = "calorie-check-v2";
const PAGES = ["/", "/history", "/settings", "/scan"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PAGES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // ไฟล์ static มีชื่อแบบ hash → cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // หน้าเว็บ → network-first แล้วค่อยใช้ cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // ถูกส่งไปหน้า login (ยังไม่ได้ล็อกอิน) → ให้เบราว์เซอร์ redirect เอง และไม่เก็บลง cache
          if (res.redirected) return Response.redirect(res.url, 302);
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(url.pathname, copy));
          return res;
        })
        .catch(() => caches.match(url.pathname).then((hit) => hit || caches.match("/"))),
    );
  }
});
