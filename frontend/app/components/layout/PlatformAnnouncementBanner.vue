<template>
  <div
    v-if="announcement && message"
    class="border-b px-4 py-2 text-sm"
    :class="severityClass"
  >
    <p class="mx-auto max-w-7xl">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
const { announcement, message } = usePlatformAnnouncement();

const severityClass = computed(() => {
  switch (announcement.value?.severity) {
    case "critical":
      return "border-danger-200 bg-danger-50 text-danger-800";
    case "warning":
      return "border-warning-200 bg-warning-50 text-warning-800";
    default:
      return "border-primary-200 bg-primary-50 text-primary-800";
  }
});
</script>
