const C = "ingles-seguimiento-eme-v1.4";
const A = ["./", "./index.html", "./styles.css", "./shim.js", "./app.js", "./ocr.js", "./transcribe.js", "./readers.js", "./ext.js", "./aprob.js", "./estadisticas.js", "./boot.js",
  "./manifest.json", "./icon.svg", "./icon-192.png", "./icon-512.png", "./vendor/fonts.css", "./vendor/jszip.min.js", "./vendor/pdf.min.js", "./vendor/pdf.worker.min.js", "./vendor/xlsx.bundle.js"];
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(C);
    const css = await fetch("./vendor/fonts.css").then(r => r.text()).catch(() => "");
    const fonts = [...css.matchAll(/url\(([^)]+)\)/g)].map(m => "./vendor/" + m[1].replace(/['"]/g, "").replace(/^\.\//, ""));
    await cache.addAll([...new Set([...A, ...fonts])]);
    self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const ext = /(?:cdn\.jsdelivr\.net|huggingface\.co|hf-mirror\.com)$/.test(url.hostname);
  if (url.origin !== location.origin && !ext) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(n => {
    if (n.ok && n.status === 200) { const cp = n.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
    return n;
  }).catch(() => caches.match("./index.html"))));
});
