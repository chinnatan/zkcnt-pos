export default defineNuxtRouteMiddleware(async () => {
  setPageLayout("admin");

  const { isAuthenticated, fetchCurrentUser } = useAuth();

  if (!isAuthenticated.value) {
    return navigateTo("/login");
  }

  const me = await fetchCurrentUser();
  if (!me?.is_platform_admin) {
    return navigateTo("/");
  }
});
