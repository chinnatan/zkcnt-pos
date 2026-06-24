<template>
  <div class="flex rounded-lg border border-border-warm bg-surface p-0.5">
    <button
      v-for="loc in locales"
      :key="loc.code"
      type="button"
      class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
      :class="
        locale === loc.code
          ? 'bg-paper text-primary-700 shadow-sm'
          : 'text-ink-muted hover:text-ink'
      "
      @click="setLocale(loc.code)"
    >
      {{ loc.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { locale, setLocale } = useI18n();

const locales = [
  { code: "th" as const, label: "ไทย" },
  { code: "en" as const, label: "EN" },
];
</script>
