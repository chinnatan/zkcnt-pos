export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, initAuth } = useAuth();

  initAuth();

  const publicPages = ["/login", "/register"];
  if (publicPages.includes(to.path)) {
    if (isAuthenticated.value) {
      return navigateTo("/");
    }
    return;
  }

  if (!isAuthenticated.value) {
    return navigateTo("/login");
  }
});
