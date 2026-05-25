import type { RecordModel } from "pocketbase";

const authUser = ref<RecordModel | null>(null);
const isAuthenticated = ref(false);
const isLoading = ref(false);

export function useAuth() {
  const { $pb } = useNuxtApp();

  function initAuth() {
    if ($pb.authStore.isValid && $pb.authStore.record) {
      authUser.value = $pb.authStore.record;
      isAuthenticated.value = true;
    } else {
      authUser.value = null;
      isAuthenticated.value = false;
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true;
    try {
      const record = await $pb.collection("users").authWithPassword(email, password);
      authUser.value = record.record;
      isAuthenticated.value = true;
      return record;
    } finally {
      isLoading.value = false;
    }
  }

  async function register(email: string, password: string, name: string) {
    isLoading.value = true;
    try {
      await $pb.collection("users").create({
        email,
        password,
        passwordConfirm: password,
        name,
      });
      return await login(email, password);
    } finally {
      isLoading.value = false;
    }
  }

  function logout() {
    $pb.authStore.clear();
    authUser.value = null;
    isAuthenticated.value = false;
    localStorage.removeItem("active_store_id");
    navigateTo("/login");
  }

  async function refreshAuth() {
    if (!$pb.authStore.isValid) return;
    try {
      const result = await $pb.collection("users").authRefresh();
      authUser.value = result.record;
      isAuthenticated.value = true;
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
