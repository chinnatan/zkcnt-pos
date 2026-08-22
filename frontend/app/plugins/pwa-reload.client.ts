export default defineNuxtPlugin(() => {
  if (!("serviceWorker" in navigator)) return;

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
