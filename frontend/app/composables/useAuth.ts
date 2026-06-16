import type { AuthUser } from "~/lib/types";

const authUser = ref<AuthUser | null>(null);
const isAuthenticated = ref(false);
const isLoading = ref(false);

export function useAuth() {
  const { $api } = useNuxtApp();

  function initAuth() {
    $api.restoreAuth();
    if ($api.isAuthenticated && $api.user) {
      authUser.value = $api.user;
      isAuthenticated.value = true;
    } else {
      authUser.value = null;
      isAuthenticated.value = false;
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true;
    try {
      const result = await $api.login(email, password);
      authUser.value = result.user;
      isAuthenticated.value = true;
      return result;
    } finally {
      isLoading.value = false;
    }
  }

  async function register(email: string, password: string, name: string) {
    isLoading.value = true;
    try {
      await $api.register(email, password, name);
      return await login(email, password);
    } finally {
      isLoading.value = false;
    }
  }

  function logout() {
    $api.logout();
    authUser.value = null;
    isAuthenticated.value = false;
    localStorage.removeItem("active_store_id");
    navigateTo("/login");
  }

  async function refreshAuth() {
    if (!$api.token) return;
    try {
      const result = await $api.refreshAuth();
      if (result?.user) {
        authUser.value = result.user;
        isAuthenticated.value = true;
      } else {
        logout();
      }
    } catch {
      logout();
    }
  }

  return {
    authUser: readonly(authUser),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    initAuth,
    login,
    register,
    logout,
    refreshAuth,
  };
}
