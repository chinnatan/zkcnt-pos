<template>
  <div
    v-if="showUpdateBanner"
    class="fixed inset-x-0 bottom-16 z-50 border-t border-primary-200 bg-primary-50 px-4 py-3 shadow-lg lg:bottom-0"
  >
    <div class="mx-auto flex max-w-lg items-start gap-3">
      <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-primary-900">
          {{ t("pwa.updateTitle") }}
        </p>
        <p class="mt-0.5 text-xs text-primary-700">
          {{ t("pwa.updateDescription", { version: displayVersion }) }}
        </p>
      </div>
      <div class="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
        <NuxtLink
          to="/release-notes"
          class="rounded-lg px-2 py-1.5 text-center text-xs font-medium text-primary-600 hover:bg-primary-100"
        >
          {{ t("releaseNotes.whatsNew") }}
        </NuxtLink>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
          @click="applyUpdate"
        >
          {{ t("pwa.updateNow") }}
        </button>
        <button
          type="button"
          class="rounded-lg px-2 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-100"
          @click="dismissUpdate"
        >
          {{ t("pwa.updateLater") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { displayVersion } = useAppVersion();
const { showUpdateBanner, applyUpdate, dismissUpdate } = usePwaUpdate();
</script>
