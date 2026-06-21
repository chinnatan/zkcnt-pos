<template>
  <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <div class="text-sm font-medium text-gray-900">
          <slot name="title">{{ title }}</slot>
        </div>
        <div v-if="subtitle || $slots.subtitle" class="mt-0.5 text-xs text-gray-400">
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
      class="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
}>();
</script>
