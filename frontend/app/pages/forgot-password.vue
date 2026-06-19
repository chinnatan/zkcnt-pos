<template>
  <div class="rounded-xl bg-white p-6 shadow-sm">
    <h2 class="mb-2 text-center text-xl font-semibold text-gray-800">{{ t('auth.forgotPassword') }}</h2>
    <p class="mb-6 text-center text-sm text-gray-500">{{ t('auth.forgotPasswordDesc') }}</p>

    <div v-if="success" class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
      {{ t('auth.resetLinkSent') }}
    </div>

    <div v-if="error" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </div>

    <form v-if="!success" @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.email') }}</label>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          :placeholder="t('auth.emailPlaceholder')"
        />
      </div>
      <button
        type="submit"
        :disabled="isLoading"
        class="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50"
      >
        {{ isLoading ? t('auth.sendingResetLink') : t('auth.sendResetLink') }}
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-gray-500">
      <NuxtLink to="/login" class="font-medium text-primary-600 hover:text-primary-700">
        {{ t('auth.backToSignIn') }}
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "auth" });

const { t } = useI18n();
const { $api } = useNuxtApp();
const email = ref("");
const error = ref("");
const success = ref(false);
const isLoading = ref(false);

async function handleSubmit() {
  error.value = "";
  isLoading.value = true;
  try {
    await $api.requestPasswordReset(email.value);
    success.value = true;
  } catch (e: any) {
    error.value = e?.message || t("errors.passwordResetFailed");
  } finally {
    isLoading.value = false;
  }
}
</script>
