export default defineNuxtPlugin(() => {
  const { setup: setupOnlineStatus } = useOnlineStatus();

  setupOnlineStatus();
  useSync();
});
