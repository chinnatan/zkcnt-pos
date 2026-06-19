<template>
  <div class="flex flex-col items-center gap-0.5">
    <span
      class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
      :class="badgeClass"
    >
      {{ statusLabel }}
    </span>
    <span v-for="msg in messages" :key="msg" class="max-w-[120px] text-[10px] text-gray-500">
      {{ t(`productsPage.errors.${msg}`) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { ImportRowStatus } from "~/lib/products/spreadsheet";

const props = defineProps<{
  status: ImportRowStatus;
  messages: string[];
}>();

const { t } = useI18n();

const statusLabel = computed(() => {
  const key = {
    valid: "statusValid",
    skipped: "statusSkipped",
    error: "statusError",
    warning: "statusWarning",
  }[props.status];
  return t(`productsPage.${key}`);
});

const badgeClass = computed(() => {
  switch (props.status) {
    case "valid":
      return "bg-green-50 text-green-700";
    case "skipped":
      return "bg-yellow-50 text-yellow-700";
    case "error":
      return "bg-red-50 text-red-700";
    case "warning":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-gray-50 text-gray-700";
  }
});
</script>
