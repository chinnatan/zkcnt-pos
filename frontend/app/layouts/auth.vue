<template>
  <div class="bg-craft-texture relative flex min-h-screen items-center justify-center p-4">
    <div class="absolute right-4 top-4">
      <LayoutLocaleSwitcher />
    </div>
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h1 class="font-display text-3xl font-bold text-primary-700">{{ t('nav.appName') }}</h1>
        <p class="mt-1 text-sm text-ink-muted">{{ t('common.appTagline') }}</p>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
</script>
