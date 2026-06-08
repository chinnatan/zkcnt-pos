<template>
  <div class="rounded-xl bg-white p-6 shadow-sm">
    <h2 class="mb-6 text-center text-xl font-semibold text-gray-800">Sign In</h2>

    <div v-if="error" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Password</label>
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          placeholder="Enter your password"
        />
      </div>
      <button
        type="submit"
        :disabled="isLoading"
        class="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50"
      >
        {{ isLoading ? 'Signing in...' : 'Sign In' }}
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-gray-500">
      Don't have an account?
      <NuxtLink to="/register" class="font-medium text-primary-600 hover:text-primary-700">
        Create one
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "auth" });

const { login, isLoading } = useAuth();
const { fetchUserStores, userStores } = useStore();
const email = ref("");
const password = ref("");
const error = ref("");

async function handleLogin() {
  error.value = "";
  try {
    await login(email.value, password.value);
    await fetchUserStores();
    navigateTo(userStores.value.length === 1 ? "/" : "/stores");
  } catch (e: any) {
    error.value = e?.message || "Invalid email or password";
  }
}
</script>
