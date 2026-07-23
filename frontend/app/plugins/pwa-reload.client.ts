export default defineNuxtPlugin(() => {
  if (!("serviceWorker" in navigator)) return;

  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  async function checkForUpdates() {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void checkForUpdates();
    }
  });

  void checkForUpdates();
});
