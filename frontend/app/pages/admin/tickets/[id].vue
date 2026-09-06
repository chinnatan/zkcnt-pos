<template>
  <div class="space-y-6">
    <div>
      <NuxtLink to="/admin/tickets" class="text-sm text-primary-700 hover:underline">← {{ t('admin.tickets.backToList') }}</NuxtLink>
    </div>

    <div v-if="isLoading" class="flex justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>

    <template v-else-if="detail">
      <UiCraftCard variant="tag" padding="md">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-ink">{{ detail.ticket.subject }}</h2>
            <p class="mt-1 text-sm text-ink-muted">
              {{ detail.ticket.reporter_name }} ({{ detail.ticket.reporter_email }})
              <span v-if="detail.ticket.store_name"> · {{ detail.ticket.store_name }}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <select v-model="status" class="rounded-lg border border-border-warm px-3 py-2 text-sm" @change="saveMeta">
              <option v-for="s in statuses" :key="s" :value="s">{{ statusLabel(s) }}</option>
            </select>
            <select v-model="priority" class="rounded-lg border border-border-warm px-3 py-2 text-sm" @change="saveMeta">
              <option v-for="p in priorities" :key="p" :value="p">{{ priorityLabel(p) }}</option>
            </select>
          </div>
        </div>
        <p class="mt-2 text-xs text-ink-muted">
          {{ categoryLabel(detail.ticket.category) }} · {{ formatDate(detail.ticket.created) }}
        </p>
      </UiCraftCard>

      <div class="space-y-4">
        <UiCraftCard
          v-for="message in detail.messages"
          :key="message.id"
          :variant="message.author_role === 'admin' ? 'stitched' : 'paper'"
          padding="md"
        >
          <div class="mb-2 flex items-center justify-between gap-2 text-xs text-ink-muted">
            <span>{{ message.author_name || message.author_email || '—' }} ({{ message.author_role }})</span>
            <span>{{ formatDate(message.created) }}</span>
          </div>
          <SupportMessageBody :html="message.body_html" />
        </UiCraftCard>
      </div>

      <UiCraftCard v-if="detail.ticket.status !== 'closed'" variant="canvas" padding="md">
        <h3 class="mb-3 text-sm font-semibold text-ink">{{ t('support.reply') }}</h3>
        <ClientOnly>
          <UiRichTextEditor
            v-model="replyHtml"
            :placeholder="t('support.replyPlaceholder')"
            :min-height="120"
          />
        </ClientOnly>
        <div class="mt-3 flex justify-end">
          <button type="button" class="btn-primary" :disabled="isReplying" @click="submitReply">
            {{ isReplying ? t('common.saving') : t('support.sendReply') }}
          </button>
        </div>
      </UiCraftCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  SupportTicketDetail,
  SupportTicketPriority,
  SupportTicketStatus,
} from "~/lib/types";

definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const route = useRoute();
const { t } = useI18n();
const { formatDate } = useFormat();
const { alert } = useDialog();
const { getTicket, patchTicket, replyToTicket } = usePlatformAdmin();
const { categoryLabel, statusLabel, priorityLabel } = useSupportTicketLabels();

const statuses: SupportTicketStatus[] = ["open", "in_progress", "waiting_user", "resolved", "closed"];
const priorities: SupportTicketPriority[] = ["low", "normal", "high"];

const detail = ref<SupportTicketDetail | null>(null);
const isLoading = ref(true);
const replyHtml = ref("");
const isReplying = ref(false);
const status = ref<SupportTicketStatus>("open");
const priority = ref<SupportTicketPriority>("normal");

async function loadTicket() {
  isLoading.value = true;
  try {
    detail.value = await getTicket(String(route.params.id));
    if (detail.value) {
      status.value = detail.value.ticket.status;
      priority.value = detail.value.ticket.priority;
    }
  } finally {
    isLoading.value = false;
  }
}

async function saveMeta() {
  if (!detail.value) return;
  try {
    detail.value = await patchTicket(detail.value.ticket.id, {
      status: status.value,
      priority: priority.value,
    });
  } catch (err) {
    await alert(err instanceof Error ? err.message : t("common.error"));
  }
}

async function submitReply() {
  if (!detail.value || !replyHtml.value.trim()) return;
  isReplying.value = true;
  try {
    detail.value = await replyToTicket(detail.value.ticket.id, replyHtml.value);
    replyHtml.value = "";
    status.value = detail.value.ticket.status;
  } catch (err) {
    await alert(err instanceof Error ? err.message : t("common.error"));
  } finally {
    isReplying.value = false;
  }
}

onMounted(loadTicket);
</script>
