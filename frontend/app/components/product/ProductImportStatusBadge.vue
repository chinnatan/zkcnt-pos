<template>
  <div class="flex flex-col items-center gap-0.5">
    <span
      class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
      :class="badgeClass"
    >
      {{ statusLabel }}
    </span>
    <span v-for="msg in messages" :key="msg" class="max-w-[120px] text-[10px] text-ink-muted">
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
      return "bg-success-50 text-accent-700";
    case "skipped":
      return "bg-warning-50 text-warning-700";
    case "error":
      return "bg-danger-50 text-danger-700";
    case "warning":
      return "bg-warning-50 text-warning-700";
    default:
      return "bg-surface text-ink";
  }
});
</script>
