import { CUSTOMERS_ENABLED } from "~/lib/features";

export default defineNuxtRouteMiddleware((to) => {
  if (!CUSTOMERS_ENABLED && to.path.startsWith("/customers")) {
    return navigateTo("/");
  }
});
