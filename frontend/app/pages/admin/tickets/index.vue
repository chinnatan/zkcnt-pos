<template>
  <div class="space-y-4">
    <UiCraftCard variant="canvas" padding="md">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('support.status') }}</label>
          <select v-model="statusFilter" class="rounded-lg border border-border-warm px-3 py-2 text-sm">
            <option value="">{{ t('support.allStatuses') }}</option>
            <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('support.category') }}</label>
          <select v-model="categoryFilter" class="rounded-lg border border-border-warm px-3 py-2 text-sm">
            <option value="">{{ t('support.allCategories') }}</option>
            <option v-for="c in categories" :key="c" :value="c">{{ categoryLabel(c) }}</option>
          </select>
        </div>
        <div class="min-w-[12rem] flex-1">
          <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('common.search') }}</label>
          <input v-model="search" type="search" class="w-full rounded-lg border border-border-warm px-3 py-2 text-sm" />
        </div>
        <button class="btn-primary" @click="loadTickets">{{ t('auditPage.search') }}</button>
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
              <th class="px-4 py-3">{{ t('support.subject') }}</th>
              <th class="px-4 py-3">{{ t('support.reporter') }}</th>
              <th class="px-4 py-3">{{ t('support.status') }}</th>
              <th class="px-4 py-3">{{ t('common.date') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-warm">
            <tr
              v-for="ticket in tickets"
              :key="ticket.id"
              class="cursor-pointer hover:bg-surface"
              @click="navigateTo(`/admin/tickets/${ticket.id}`)"
            >
              <td class="max-w-xs px-4 py-3">
                <p class="truncate font-medium text-ink">{{ ticket.subject }}</p>
                <p class="truncate text-xs text-ink-muted">{{ ticket.body_text }}</p>
              </td>
              <td class="px-4 py-3">
                <p>{{ ticket.reporter_name || '—' }}</p>
                <p class="text-xs text-ink-muted">{{ ticket.reporter_email }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="rounded-full bg-surface px-2 py-0.5 text-xs">{{ statusLabel(ticket.status) }}</span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-ink-muted">{{ formatDate(ticket.updated) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="border-t border-border-warm p-4 text-center text-sm text-ink-muted">
        {{ t('auditPage.showing', { shown: tickets.length, total: totalItems }) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SupportTicket, SupportTicketCategory, SupportTicketStatus } from "~/lib/types";

definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const { t } = useI18n();
const { formatDate } = useFormat();
const { listTickets } = usePlatformAdmin();
const { categoryLabel, statusLabel } = useSupportTicketLabels();

const statuses: SupportTicketStatus[] = ["open", "in_progress", "waiting_user", "resolved", "closed"];
const categories: SupportTicketCategory[] = ["bug", "question", "feature", "billing", "other"];

const tickets = ref<SupportTicket[]>([]);
const totalItems = ref(0);
const isLoading = ref(true);
const statusFilter = ref("");
const categoryFilter = ref("");
const search = ref("");

async function loadTickets() {
  isLoading.value = true;
  try {
    const result = await listTickets({
      limit: 100,
      status: statusFilter.value || undefined,
      category: categoryFilter.value || undefined,
      search: search.value.trim() || undefined,
    });
    tickets.value = result.items;
    totalItems.value = result.totalItems;
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadTickets);
</script>
