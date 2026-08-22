import { useRegisterSW } from "virtual:pwa-register/vue";

const dismissed = ref(false);

let needRefreshRef: Ref<boolean> | null = null;
let updateServiceWorkerFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

function initRegisterSW() {
  if (!import.meta.client || updateServiceWorkerFn) return;

  const registration = useRegisterSW({
    immediate: true,
    onNeedRefresh() {
      dismissed.value = false;
    },
  });

  needRefreshRef = registration.needRefresh;
  updateServiceWorkerFn = registration.updateServiceWorker;
}

export function usePwaUpdate() {
  initRegisterSW();

  const showUpdateBanner = computed(
    () => (needRefreshRef?.value ?? false) && !dismissed.value,
  );

  function applyUpdate() {
    void updateServiceWorkerFn?.(true);
  }

  function dismissUpdate() {
    dismissed.value = true;
  }

  return {
    showUpdateBanner,
    applyUpdate,
    dismissUpdate,
  };
}
