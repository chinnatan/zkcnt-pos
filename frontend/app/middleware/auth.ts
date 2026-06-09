export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, initAuth } = useAuth();

  initAuth();

  const isPublicPage =
    to.path === "/login" ||
    to.path === "/register" ||
    to.path.startsWith("/invite/");

  if (isPublicPage) {
    if (isAuthenticated.value) {
      return navigateTo("/");
    }
    return;
  }

  if (!isAuthenticated.value) {
    return navigateTo("/login");
  }
});
