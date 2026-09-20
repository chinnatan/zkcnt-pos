<template>
  <button
    type="button"
    class="touch-pos inline-flex h-9 w-9 items-center justify-center border border-border-warm bg-paper text-ink transition hover:border-accent-400 hover:bg-accent-50"
    :aria-label="theme === 'dark' ? t('common.lightMode') : t('common.darkMode')"
    :title="theme === 'dark' ? t('common.lightMode') : t('common.darkMode')"
    @click="toggle"
  >
    <svg v-if="theme === 'dark'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="4" />
      <path stroke-linecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3l1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3l1.42-1.42" />
    </svg>
    <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.8 15.2A8.5 8.5 0 0 1 8.8 3.2a8.5 8.5 0 1 0 12 12Z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { theme, init, toggle } = useTheme();

onMounted(init);
</script>
