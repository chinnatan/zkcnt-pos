export default defineNuxtPlugin(() => {
  const { setup: setupOnlineStatus } = useOnlineStatus();
  const { initSync } = useSync();
  const { activeStoreId } = useStore();

  setupOnlineStatus();

  watch(
    activeStoreId,
    (id) => {
      if (id) initSync();
    },
    { immediate: true },
  );
});
