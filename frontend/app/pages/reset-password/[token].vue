<template>
  <UiCraftCard variant="stitched" padding="md">
    <div v-if="isLoading" class="py-8 text-center text-sm text-ink-muted">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="!tokenValid" class="space-y-4">
      <h2 class="text-center text-xl font-semibold text-ink">{{ t('auth.resetPassword') }}</h2>
      <div class="rounded-lg bg-danger-50 p-4 text-sm text-danger-700">
        {{ t('auth.tokenExpired') }}
      </div>
      <NuxtLink
        to="/forgot-password"
        class="block w-full rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-700"
      >
        {{ t('auth.sendResetLink') }}
      </NuxtLink>
    </div>

    <div v-else-if="resetSuccess" class="space-y-4">
      <h2 class="text-center text-xl font-semibold text-ink">{{ t('auth.resetPassword') }}</h2>
      <div class="rounded-lg bg-success-50 p-4 text-sm text-accent-700">
        {{ t('auth.passwordResetSuccess') }}
      </div>
      <NuxtLink
        to="/login"
        class="block w-full rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-700"
      >
        {{ t('auth.signIn') }}
      </NuxtLink>
    </div>

    <template v-else>
      <h2 class="mb-2 text-center text-xl font-semibold text-ink">{{ t('auth.resetPassword') }}</h2>
      <p v-if="tokenEmail" class="mb-6 text-center text-sm text-ink-muted">
        {{ t('auth.resetPasswordFor', { email: tokenEmail }) }}
      </p>

      <div v-if="error" class="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('auth.newPassword') }}</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            :placeholder="t('auth.passwordMinPlaceholder')"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('auth.confirmPassword') }}</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            :placeholder="t('auth.passwordMinPlaceholder')"
          />
        </div>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50"
        >
          {{ isSubmitting ? t('auth.resettingPassword') : t('auth.resetPassword') }}
        </button>
      </form>
    </template>
  </UiCraftCard>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const { $api } = useNuxtApp();

const token = computed(() => String(route.params.token || ""));
const isLoading = ref(true);
const isSubmitting = ref(false);
const tokenValid = ref(false);
const tokenEmail = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const resetSuccess = ref(false);

onMounted(async () => {
  if (!token.value) {
    tokenValid.value = false;
    isLoading.value = false;
    return;
  }

  try {
    const result = await $api.validateResetToken(token.value);
    tokenValid.value = result.valid;
    tokenEmail.value = result.email ?? "";
  } catch {
    tokenValid.value = false;
  } finally {
    isLoading.value = false;
  }
});

async function handleSubmit() {
  error.value = "";

  if (password.value !== confirmPassword.value) {
    error.value = t("auth.passwordMismatch");
    return;
  }

  isSubmitting.value = true;
  try {
    await $api.resetPassword(token.value, password.value);
    resetSuccess.value = true;
  } catch (e: any) {
    error.value = e?.message || t("errors.passwordResetFailed");
  } finally {
    isSubmitting.value = false;
  }
}
</script>
