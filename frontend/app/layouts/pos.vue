<template>
  <div class="flex h-screen flex-col overflow-hidden bg-gray-100">
    <header
      class="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4"
    >
      <div class="flex items-center gap-3">
        <NuxtLink to="/" class="text-lg font-bold text-primary-600">zKCNT POS</NuxtLink>
        <span
          v-if="activeStore"
          class="rounded-full bg-primary-50 px-3 py-0.5 text-sm font-medium text-primary-700"
        >
          {{ activeStore.name }}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <span
          class="flex items-center gap-1.5 text-sm"
          :class="isOnline ? 'text-success-500' : 'text-danger-500'"
        >
          <span class="h-2 w-2 rounded-full" :class="isOnline ? 'bg-success-500' : 'bg-danger-500'" />
          {{ isOnline ? "Online" : "Offline" }}
        </span>
        <NuxtLink
          to="/"
          class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Dashboard
        </NuxtLink>
      </div>
    </header>
    <div class="flex-1 overflow-hidden">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const { activeStore } = useStore();
const { isOnline } = useOnlineStatus();
</script>
