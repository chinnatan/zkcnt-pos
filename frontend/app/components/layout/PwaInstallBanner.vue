<template>
  <div
    v-if="showInstallBanner"
    class="fixed inset-x-0 bottom-0 z-50 border-t border-primary-200 bg-primary-50 px-4 py-3 shadow-lg"
  >
    <div class="mx-auto flex max-w-lg items-start gap-3">
      <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-primary-900">
          {{ t("pwa.installTitle") }}
        </p>
        <p class="mt-0.5 text-xs text-primary-700">
          {{ t("pwa.installDescription") }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-100"
        :aria-label="t('pwa.dismiss')"
        @click="dismissInstallBanner"
      >
        {{ t("pwa.dismiss") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { showInstallBanner, setup, dismissInstallBanner } = usePwaInstall();

onMounted(() => {
  setup();
});
</script>
