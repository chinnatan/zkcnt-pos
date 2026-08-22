<template>
  <div>
    <div :class="tableFrom === 'lg' ? 'hidden lg:block' : 'hidden md:block'">
      <slot name="table" />
    </div>
    <div
      class="flex flex-col gap-3 p-4"
      :class="tableFrom === 'lg' ? 'lg:hidden' : 'md:hidden'"
    >
      <slot name="cards" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Breakpoint ที่เริ่มแสดงตารางแทนการ์ด (default: md) */
    tableFrom?: "md" | "lg";
  }>(),
  { tableFrom: "md" },
);
</script>
