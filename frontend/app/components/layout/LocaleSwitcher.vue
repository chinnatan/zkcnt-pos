<template>
  <div class="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
    <button
      v-for="loc in locales"
      :key="loc.code"
      type="button"
      class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
      :class="
        locale === loc.code
          ? 'bg-white text-primary-700 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
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
