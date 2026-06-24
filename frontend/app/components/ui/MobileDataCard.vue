<template>
  <UiCraftCard :variant="variant" padding="sm">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <div class="text-sm font-medium text-ink">
          <slot name="title">{{ title }}</slot>
        </div>
        <div v-if="subtitle || $slots.subtitle" class="mt-0.5 text-xs text-ink-muted">
          <slot name="subtitle">{{ subtitle }}</slot>
        </div>
      </div>
      <slot name="badge" />
    </div>

    <div v-if="$slots.fields" class="mt-3 grid grid-cols-2 gap-2 text-sm">
      <slot name="fields" />
    </div>

    <div
      v-if="$slots.actions"
      class="mt-3 flex items-center justify-end gap-2 border-t border-border-warm/60 pt-3"
    >
      <slot name="actions" />
    </div>
  </UiCraftCard>
</template>

<script setup lang="ts">
import type { CraftCardVariant } from "~/lib/ui/craftCard";

withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    variant?: CraftCardVariant;
  }>(),
  { variant: "label" },
);
</script>
