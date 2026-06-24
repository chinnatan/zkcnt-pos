export default defineNuxtPlugin(() => {
  const { initAuth, isAuthenticated } = useAuth();
  const { fetchUserStores } = useStore();
  const { setup: setupOnlineStatus } = useOnlineStatus();

  setupOnlineStatus();
  initAuth();

  if (isAuthenticated.value) {
    // Do not block app mount — critical for offline PWA cold start
    void fetchUserStores();
  }
});
