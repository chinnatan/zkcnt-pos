const DISMISS_KEY = "pwa-install-dismissed";

const showInstallBanner = ref(false);

function isIosDevice(): boolean {
  if (!import.meta.client) return false;

  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isIosSafari(): boolean {
  if (!import.meta.client) return false;

  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  const isInAppBrowser = /FBAN|FBAV|Line|Instagram|Twitter/.test(ua);

  return isIosDevice() && isSafari && !isInAppBrowser;
}

function isStandalone(): boolean {
  if (!import.meta.client) return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePwaInstall() {
  function setup() {
    if (!import.meta.client) return;

    if (isStandalone() || !isIosSafari()) {
      showInstallBanner.value = false;
      return;
    }

    showInstallBanner.value = localStorage.getItem(DISMISS_KEY) !== "1";
  }

  function dismissInstallBanner() {
    localStorage.setItem(DISMISS_KEY, "1");
    showInstallBanner.value = false;
  }

  return {
    showInstallBanner: readonly(showInstallBanner),
    setup,
    dismissInstallBanner,
  };
}
