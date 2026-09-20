<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/settings" class="text-sm text-primary-600 hover:underline">
          ← {{ t('settingsPage.title') }}
        </NuxtLink>
        <h2 class="mt-1 text-lg font-semibold text-ink">{{ t('settingsPage.sessions') }}</h2>
      </div>
    </div>

    <div class="craft-card craft-card--paper overflow-x-auto p-5">
      <div v-if="isLoading" class="py-12 text-center text-ink-muted">{{ t('common.loading') }}</div>
      <table v-else class="w-full text-left text-sm">
        <thead class="border-b border-border-warm text-xs uppercase text-ink-muted">
          <tr>
            <th class="px-3 py-3">{{ t('admin.devices.user') }}</th>
            <th class="px-3 py-3">{{ t('admin.devices.version') }}</th>
            <th class="px-3 py-3">{{ t('admin.devices.lastSeen') }}</th>
            <th class="px-3 py-3">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-warm">
          <tr v-for="session in sessions" :key="session.id">
            <td class="px-3 py-3">
              <div class="font-medium">{{ session.user_name }}</div>
              <div class="text-xs text-ink-muted">{{ session.user_email }}</div>
            </td>
            <td class="px-3 py-3 text-xs">{{ session.client_version }} ({{ session.client_build }})</td>
            <td class="px-3 py-3 text-ink-muted">{{ formatDate(session.last_seen_at) }}</td>
            <td class="px-3 py-3">
              <button
                type="button"
                class="rounded-lg border border-danger-200 px-3 py-1.5 text-xs font-medium text-danger-700 hover:bg-danger-50"
                @click="revoke(session.user)"
              >
                {{ t('admin.devices.revoke') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!isLoading && sessions.length === 0" class="py-12 text-center text-ink-muted">
        {{ t('admin.devices.empty') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminClientSession } from '~/lib/types';

definePageMeta({ middleware: 'auth' });

const { t } = useI18n();
const { formatDate } = useFormat();
const { activeStoreId, isManager } = useStore();
const { $api } = useNuxtApp();
const sessions = ref<AdminClientSession[]>([]);
const isLoading = ref(true);

if (!isManager.value) {
  await navigateTo('/settings');
}

async function loadSessions() {
  if (!activeStoreId.value) return;
  isLoading.value = true;
  try {
    const result = await $api.send<{ items: AdminClientSession[] }>(
      `/stores/${activeStoreId.value}/sessions`,
    );
    sessions.value = result.items;
  } finally {
    isLoading.value = false;
  }
}

async function revoke(userId: string) {
  if (!activeStoreId.value || !window.confirm(t('admin.devices.confirmRevoke'))) return;
  await $api.send(`/stores/${activeStoreId.value}/members/${userId}/revoke-sessions`, {
    method: 'POST',
  });
  await loadSessions();
}

onMounted(loadSessions);
</script>
