<template>
  <div class="space-y-4">
    <div class="rounded-xl bg-paper shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border-warm bg-surface text-xs uppercase text-ink-muted">
            <tr>
              <th class="px-4 py-3">{{ t('admin.devices.user') }}</th>
              <th class="px-4 py-3">{{ t('admin.stores.name') }}</th>
              <th class="px-4 py-3">{{ t('admin.devices.version') }}</th>
              <th class="px-4 py-3">{{ t('admin.devices.syncPending') }}</th>
              <th class="px-4 py-3">{{ t('admin.devices.lastSeen') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-warm">
            <tr
              v-for="session in sessions"
              :key="session.id"
              class="hover:bg-surface"
              :class="session.pending_sync_count > 0 ? 'bg-warning-50/30' : ''"
            >
              <td class="px-4 py-3">
                <div class="font-medium">{{ session.user_name }}</div>
                <NuxtLink :to="`/admin/users/${session.user}`" class="text-xs text-primary-700 hover:underline">
                  {{ session.user_email }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3">
                <NuxtLink :to="`/admin/stores/${session.store}`" class="text-primary-700 hover:underline">
                  {{ session.store_name }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 text-xs">{{ session.client_version }} ({{ session.client_build }})</td>
              <td class="px-4 py-3">
                <span :class="session.pending_sync_count > 0 ? 'font-semibold text-warning-600' : 'text-success-600'">
                  {{ session.pending_sync_count }}
                </span>
              </td>
              <td class="px-4 py-3 text-ink-muted">{{ formatDate(session.last_seen_at) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="sessions.length === 0" class="py-12 text-center text-ink-muted">{{ t('admin.devices.empty') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminClientSession } from "~/lib/types";

definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const { t } = useI18n();
const { formatDate } = useFormat();
const { listDevices } = usePlatformAdmin();

const sessions = ref<AdminClientSession[]>([]);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const result = await listDevices({ limit: 100 });
    sessions.value = result.items;
  } finally {
    isLoading.value = false;
  }
});
</script>
