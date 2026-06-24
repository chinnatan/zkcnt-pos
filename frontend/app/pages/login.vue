<template>
  <UiCraftCard variant="stitched" padding="md">
    <h2 class="font-display mb-6 text-center text-xl font-semibold text-ink">{{ t('auth.signIn') }}</h2>

    <div v-if="error" class="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.email') }}</label>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          data-testid="email"
          class="input"
          :placeholder="t('auth.emailPlaceholder')"
        />
      </div>
      <div>
        <div class="mb-1 flex items-center justify-between">
          <label class="text-sm font-medium text-ink">{{ t('common.password') }}</label>
          <NuxtLink to="/forgot-password" class="text-xs font-medium text-primary-600 hover:text-primary-700">
            {{ t('auth.forgotPassword') }}
          </NuxtLink>
        </div>
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          data-testid="password"
          class="input"
          :placeholder="t('auth.passwordPlaceholder')"
        />
      </div>
      <button
        type="submit"
        :disabled="isLoading"
        data-testid="login-btn"
        class="btn-primary w-full"
      >
        {{ isLoading ? t('auth.signingIn') : t('auth.signIn') }}
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-ink-muted">
      {{ t('auth.noAccount') }}
      <NuxtLink to="/register" class="font-medium text-primary-600 hover:text-primary-700">
        {{ t('auth.createOne') }}
      </NuxtLink>
    </p>
  </UiCraftCard>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const { login, isLoading } = useAuth();
const { fetchUserStores, userStores } = useStore();
const email = ref("");
const password = ref("");
const error = ref("");

const redirectPath = computed(() => String(route.query.redirect || ""));

async function handleLogin() {
  error.value = "";
  try {
    await login(email.value, password.value);
    await fetchUserStores();

    if (redirectPath.value) {
      navigateTo(redirectPath.value);
      return;
    }

    navigateTo(userStores.value.length === 1 ? "/" : "/stores");
  } catch (e: any) {
    error.value = e?.message || t("errors.invalidCredentials");
  }
}
</script>
