/* Registro de la PWA (funciona sin conexión después de la primera visita) */
(function () {
  if ("serviceWorker" in navigator && !/[?&]nosw\b/.test(location.search)) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(err => console.warn("SW", err)); });
  }
})();
