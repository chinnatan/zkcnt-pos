<template>
  <div v-if="offlineSyncEnabled" class="relative">
    <button
      class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      :class="failedCount > 0
        ? 'bg-danger-50 text-danger-700'
        : pendingSyncCount > 0
          ? 'bg-warning-50 text-warning-700'
          : 'bg-success-50 text-success-700'"
      :title="t('sync.title')"
      @click="open"
    >
      <span
        class="h-1.5 w-1.5 rounded-full"
        :class="failedCount > 0
          ? 'bg-danger-500'
          : pendingSyncCount > 0
            ? 'bg-warning-500'
            : 'bg-success-500'"
      />
      <span class="hidden sm:inline">{{
        failedCount > 0
          ? t('sync.failed', { count: failedCount })
          : pendingSyncCount > 0
            ? t('common.pending', { count: pendingSyncCount })
            : t('common.synced')
      }}</span>
    </button>

    <UiCraftModal
      :show="show"
      variant="paper"
      size="lg"
      align="top"
      :close-on-backdrop="true"
      @close="show = false"
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="font-display text-lg font-semibold text-ink">{{ t('sync.title') }}</h3>
        <button class="btn-secondary text-sm" :disabled="!isOnline || isSyncing" @click="runSync">
          {{ isSyncing ? t('sync.syncing') : t('sync.syncNow') }}
        </button>
      </div>
      <p class="mt-1 text-xs text-ink-muted">
        {{ lastSyncAt ? t('sync.lastSync', { time: formatTime(lastSyncAt) }) : t('sync.never') }}
      </p>

      <h4 class="mt-4 font-display text-sm font-semibold text-ink">
        {{ t('sync.queue') }} ({{ queueItems.length }})
      </h4>
      <p v-if="!queueItems.length" class="mt-2 text-sm text-ink-muted">{{ t('sync.queueEmpty') }}</p>
      <div v-else class="mt-2 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs text-ink-muted">
            <tr>
              <th class="py-1 pr-3 font-medium">{{ t('sync.collection') }}</th>
              <th class="py-1 pr-3 font-medium">{{ t('sync.action') }}</th>
              <th class="py-1 pr-3 font-medium">{{ t('sync.record') }}</th>
              <th class="py-1 pr-3 font-medium">{{ t('sync.statusCol') }}</th>
              <th class="py-1 pr-3 font-medium">{{ t('sync.retry') }}</th>
              <th class="py-1 font-medium">{{ t('sync.detail') }}</th>
            </tr>
          </thead>
          <tbody class="text-ink">
            <tr v-for="item in queueItems" :key="item.id" class="border-t border-border-warm align-top">
              <td class="py-1.5 pr-3">{{ collectionLabel(item.collection) }}</td>
              <td class="py-1.5 pr-3">{{ item.action }}</td>
              <td class="max-w-32 truncate py-1.5 pr-3 font-mono text-xs">{{ item.record_id }}</td>
              <td class="py-1.5 pr-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="item.status === 'error'
                    ? 'bg-danger-50 text-danger-700'
                    : item.status === 'in_flight'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-warning-50 text-warning-700'"
                >{{ statusLabel(item.status) }}</span>
              </td>
              <td class="py-1.5 pr-3">{{ item.retry_count }}</td>
              <td class="max-w-48 truncate py-1.5 text-xs text-ink-muted" :title="item.error_message || formatTime(item.created_at)">
                {{ item.error_message || formatTime(item.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template v-if="isManager">
        <h4 class="mt-5 font-display text-sm font-semibold text-ink">{{ t('sync.conflicts') }}</h4>
        <p v-if="!conflicts.length" class="mt-2 text-sm text-ink-muted">{{ t('sync.conflictsEmpty') }}</p>
        <ul v-else class="mt-2 space-y-1.5">
          <li v-for="row in conflicts" :key="row.id" class="rounded-lg bg-surface px-3 py-2 text-xs">
            <span class="font-medium text-ink">{{ collectionLabel(row.collection) }} · {{ row.record_id }}</span>
            <span class="ml-2 text-ink-muted">{{ t(`sync.reason.${row.reason}`) }}</span>
            <span class="ml-2 text-ink-muted">{{ formatTime(row.created) }}</span>
          </li>
        </ul>

        <h4 class="mt-5 font-display text-sm font-semibold text-ink">{{ t('sync.check') }}</h4>
        <p class="mt-1 text-xs text-ink-muted">{{ t('sync.checkHint') }}</p>
        <button class="btn-secondary mt-2 text-sm" :disabled="!isOnline || verifying" @click="runVerify">
          {{ verifying ? t('sync.checking') : t('sync.checkRun') }}
        </button>
        <p v-if="verifyError" class="mt-2 text-sm text-danger-700">{{ verifyError }}</p>
        <div v-if="verifyRows.length" class="mt-2 overflow-x-auto">
          <p class="mb-1 text-sm" :class="verifyMatch ? 'text-success-700' : 'text-warning-700'">
            {{ verifyMatch ? t('sync.checkMatch') : t('sync.checkMismatch') }}
          </p>
          <table class="w-full text-left text-sm">
            <thead class="text-xs text-ink-muted">
              <tr>
                <th class="py-1 pr-3 font-medium">{{ t('sync.collection') }}</th>
                <th class="py-1 pr-3 font-medium">{{ t('sync.checkLocal') }}</th>
                <th class="py-1 pr-3 font-medium">{{ t('sync.checkServer') }}</th>
                <th class="py-1 font-medium">{{ t('sync.checkDiff') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in verifyRows"
                :key="row.key"
                class="border-t border-border-warm"
                :class="row.local === row.server ? 'text-ink' : 'bg-warning-50 text-warning-700'"
              >
                <td class="py-1.5 pr-3">{{ row.key }}</td>
                <td class="py-1.5 pr-3">{{ formatNumber(row.local) }}</td>
                <td class="py-1.5 pr-3">{{ formatNumber(row.server) }}</td>
                <td class="py-1.5">{{ row.local - row.server === 0 ? "—" : formatNumber(row.local - row.server) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </UiCraftModal>
  </div>
</template>

<script setup lang="ts">
import { db } from "~/lib/db";
import type { SyncConflict, SyncQueueItem } from "~/lib/types";
import { getPendingItems } from "~/lib/sync/queue";
import { computeLocalVerify } from "~/lib/sync/verify";

const { t } = useI18n();
const { $api } = useNuxtApp();
const { activeStoreId, isManager } = useStore();
const { isOnline } = useOnlineStatus();
const { pendingSyncCount, failedCount, isSyncing, lastSyncAt, performSync } = useSync();
const offlineSyncEnabled = useStoreFeatureEnabled("offline_sync_enabled");

const show = ref(false);
const queueItems = ref<SyncQueueItem[]>([]);
const conflicts = ref<SyncConflict[]>([]);
const verifying = ref(false);
const verifyError = ref("");
const verifyRows = ref<{ key: string; local: number; server: number }[]>([]);

const verifyMatch = computed(() => verifyRows.value.every((r) => r.local === r.server));

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH");
}

function formatNumber(n: number) {
  return n.toLocaleString("th-TH");
}

function collectionLabel(name: string) {
  const key = `sync.names.${name}`;
  const label = t(key);
  return label === key ? name : label;
}

function statusLabel(status: string) {
  return t(`sync.status.${status}`);
}

async function load() {
  if (!activeStoreId.value) return;
  queueItems.value = await getPendingItems(activeStoreId.value);
  if (isManager.value) {
    const all = await db.syncConflicts
      .where("store")
      .equals(activeStoreId.value)
      .toArray();
    conflicts.value = all
      .sort((a, b) => b.created.localeCompare(a.created))
      .slice(0, 50);
  }
}

async function open() {
  show.value = true;
  verifyError.value = "";
  verifyRows.value = [];
  await load();
}

async function runSync() {
  await performSync();
  await load();
}

async function runVerify() {
  if (!activeStoreId.value || verifying.value) return;
  verifying.value = true;
  verifyError.value = "";
  try {
    const [server, local] = await Promise.all([
      $api.syncVerify(activeStoreId.value),
      computeLocalVerify(activeStoreId.value),
    ]);
    const rows = Object.keys(local).map((key) => ({
      key,
      local: local[key]?.count ?? 0,
      server: server.collections[key]?.count ?? 0,
    }));
    const serverTotal = server.collections.orders?.completed_total;
    if (serverTotal != null) {
      rows.push({
        key: "orders_total",
        local: local.orders?.completed_total ?? 0,
        server: serverTotal,
      });
    }
    verifyRows.value = rows;
  } catch (e: unknown) {
    verifyError.value = e instanceof Error ? e.message : t("sync.checkFailed");
  } finally {
    verifying.value = false;
  }
}

watch(pendingSyncCount, () => {
  if (show.value) void load();
});
</script>
