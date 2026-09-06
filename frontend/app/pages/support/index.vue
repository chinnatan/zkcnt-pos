<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-ink">{{ t('support.title') }}</h2>
      <NuxtLink to="/support/new" class="btn-primary">{{ t('support.newTicket') }}</NuxtLink>
    </div>

    <div v-if="isLoading" class="flex justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>

    <UiCraftCard v-else-if="tickets.length === 0" variant="paper" padding="md">
      <p class="text-center text-ink-muted">{{ t('support.empty') }}</p>
    </UiCraftCard>

    <div v-else class="space-y-3">
      <NuxtLink
        v-for="ticket in tickets"
        :key="ticket.id"
        :to="`/support/${ticket.id}`"
        class="block rounded-xl bg-paper p-4 shadow-sm transition hover:shadow-md"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-ink">{{ ticket.subject }}</p>
            <p class="mt-1 line-clamp-2 text-sm text-ink-muted">{{ ticket.body_text }}</p>
          </div>
          <span class="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-muted">
            {{ statusLabel(ticket.status) }}
          </span>
        </div>
        <p class="mt-2 text-xs text-ink-muted">
          {{ categoryLabel(ticket.category) }} · {{ formatDate(ticket.updated) }}
        </p>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SupportTicket } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { formatDate } = useFormat();
const { listTickets } = useSupportTickets();
const { categoryLabel, statusLabel } = useSupportTicketLabels();

const tickets = ref<SupportTicket[]>([]);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const result = await listTickets({ limit: 100 });
    tickets.value = result.items;
  } finally {
    isLoading.value = false;
  }
});
</script>
