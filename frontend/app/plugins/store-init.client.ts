export default defineNuxtPlugin(async () => {
  const { initAuth, isAuthenticated } = useAuth();
  const { fetchUserStores } = useStore();

  initAuth();

  if (isAuthenticated.value) {
    await fetchUserStores();
  }
});
