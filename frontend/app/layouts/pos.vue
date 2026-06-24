<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-craft-texture">
    <header
      class="flex h-14 shrink-0 items-center justify-between border-b border-primary-200/60 bg-paper px-3 sm:px-4"
      style="border-bottom-style: dashed"
    >
      <div class="flex min-w-0 items-center gap-2 sm:gap-3">
        <NuxtLink to="/" class="font-display hidden shrink-0 text-lg font-bold text-primary-700 sm:inline">
          {{ t('nav.appName') }}
        </NuxtLink>
        <span
          v-if="activeStore"
          class="max-w-[140px] truncate rounded-md border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 sm:max-w-none sm:px-3 sm:text-sm"
          style="transform: rotate(-0.3deg)"
        >
          {{ activeStore.name }}
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-2 sm:gap-3">
        <div class="hidden sm:block">
          <LayoutLocaleSwitcher />
        </div>
        <span
          class="flex items-center gap-1.5 text-sm"
          :class="isOnline ? 'text-success-500' : 'text-danger-500'"
          :title="isOnline ? t('common.online') : t('common.offline')"
        >
          <span class="h-2 w-2 rounded-full" :class="isOnline ? 'bg-success-500' : 'bg-danger-500'" />
          <span class="hidden sm:inline">{{ isOnline ? t('common.online') : t('common.offline') }}</span>
        </span>
        <NuxtLink
          to="/"
          class="touch-pos flex items-center justify-center rounded-md border border-dashed border-border-warm bg-paper p-2 text-ink hover:border-primary-200 hover:bg-primary-50 sm:px-3 sm:py-1.5 sm:text-sm"
          :aria-label="t('nav.dashboard')"
        >
          <svg class="h-5 w-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span class="hidden sm:inline">{{ t('nav.dashboard') }}</span>
        </NuxtLink>
      </div>
    </header>
    <div class="flex-1 overflow-hidden">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { activeStore } = useStore();
const { isOnline } = useOnlineStatus();
</script>
