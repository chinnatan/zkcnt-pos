<template>
  <div class="space-y-4">
    <UiCraftCard variant="canvas" padding="md">
      <div class="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('auditPage.since') }}</label>
          <input v-model="since" type="datetime-local" class="rounded-lg border border-border-warm px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('auditPage.until') }}</label>
          <input v-model="until" type="datetime-local" class="rounded-lg border border-border-warm px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('auditPage.actionFilter') }}</label>
          <select v-model="actionFilter" class="rounded-lg border border-border-warm px-3 py-2 text-sm">
            <option value="">{{ t('auditPage.allActions') }}</option>
            <option v-for="a in securityActions" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <button class="btn-primary" @click="loadEvents">{{ t('auditPage.search') }}</button>
        <button class="btn-secondary" @click="exportAuditCsv({ since: sinceIso, until: untilIso, action: actionFilter || undefined })">
          {{ t('auditPage.exportCsv') }}
        </button>
      </div>
    </UiCraftCard>

    <div class="rounded-xl bg-paper shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border-warm bg-surface text-xs uppercase text-ink-muted">
            <tr>
              <th class="px-4 py-3">{{ t('common.date') }}</th>
              <th class="px-4 py-3">{{ t('admin.activity.store') }}</th>
              <th class="px-4 py-3">{{ t('auditPage.actor') }}</th>
              <th class="px-4 py-3">{{ t('auditPage.action') }}</th>
              <th class="px-4 py-3">{{ t('auditPage.summary') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-warm">
            <tr
              v-for="event in events"
              :key="event.id"
              class="hover:bg-surface"
              :class="isSecurityEvent(event.action) ? 'bg-warning-50/40' : ''"
            >
              <td class="whitespace-nowrap px-4 py-3 text-ink-muted">{{ formatDate(event.created) }}</td>
              <td class="px-4 py-3 text-xs">{{ event.store || '—' }}</td>
              <td class="px-4 py-3">{{ event.actor_name || '—' }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full bg-surface px-2 py-0.5 text-xs">{{ event.action }}</span>
              </td>
              <td class="max-w-md truncate px-4 py-3" :title="event.summary">{{ event.summary }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="border-t border-border-warm p-4 text-center text-sm text-ink-muted">
        {{ t('auditPage.showing', { shown: events.length, total: totalItems }) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AuditEvent } from "~/lib/types";

definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const { t } = useI18n();
const { formatDate, toDatetimeLocalValue, datetimeLocalToIso } = useFormat();
const { listAudit, exportAuditCsv } = usePlatformAdmin();

const events = ref<AuditEvent[]>([]);
const totalItems = ref(0);
const isLoading = ref(true);
const since = ref("");
const until = ref("");
const actionFilter = ref("");

const securityActions = [
  "auth.login_failed",
  "auth.login",
  "auth.register",
  "store.transaction_history_clear",
  "member.role_change",
  "admin.store_deactivate",
  "admin.user_disable",
];

const sinceIso = computed(() => datetimeLocalToIso(since.value));
const untilIso = computed(() => datetimeLocalToIso(until.value));

function isSecurityEvent(action: string) {
  return action.startsWith("auth.") || action.startsWith("admin.");
}

async function loadEvents() {
  isLoading.value = true;
  try {
    const result = await listAudit({
      since: sinceIso.value,
      until: untilIso.value,
      action: actionFilter.value || undefined,
      limit: 100,
    });
    events.value = result.items;
    totalItems.value = result.totalItems;
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  since.value = toDatetimeLocalValue(d);
  until.value = toDatetimeLocalValue(new Date());
  await loadEvents();
});
</script>
