const isOnline = ref(true);

export function useOnlineStatus() {
  function setup() {
    if (!import.meta.client) return;

    isOnline.value = navigator.onLine;

    window.addEventListener("online", () => {
      isOnline.value = true;
    });

    window.addEventListener("offline", () => {
      isOnline.value = false;
    });
  }

  return {
    isOnline: readonly(isOnline),
    setup,
  };
}
