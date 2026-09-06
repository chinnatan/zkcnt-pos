<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <NuxtLink to="/support" class="text-sm text-primary-700 hover:underline">← {{ t('support.backToList') }}</NuxtLink>
    </div>

    <div v-if="isLoading" class="flex justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>

    <template v-else-if="detail">
      <UiCraftCard variant="tag" padding="md">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-ink">{{ detail.ticket.subject }}</h2>
            <p class="mt-1 text-sm text-ink-muted">
              {{ categoryLabel(detail.ticket.category) }}
              · {{ statusLabel(detail.ticket.status) }}
              · {{ formatDate(detail.ticket.created) }}
            </p>
          </div>
        </div>
      </UiCraftCard>

      <div class="space-y-4">
        <UiCraftCard
          v-for="message in detail.messages"
          :key="message.id"
          :variant="message.author_role === 'admin' ? 'stitched' : 'paper'"
          padding="md"
        >
          <div class="mb-2 flex items-center justify-between gap-2 text-xs text-ink-muted">
            <span>
              {{ message.author_role === 'admin' ? t('support.adminReply') : (message.author_name || t('support.you')) }}
            </span>
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

      <p v-else class="text-center text-sm text-ink-muted">{{ t('support.closedNotice') }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SupportTicketDetail } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const { t } = useI18n();
const { formatDate } = useFormat();
const { alert } = useDialog();
const { getTicket, replyToTicket } = useSupportTickets();
const { categoryLabel, statusLabel } = useSupportTicketLabels();

const detail = ref<SupportTicketDetail | null>(null);
const isLoading = ref(true);
const replyHtml = ref("");
const isReplying = ref(false);

async function loadTicket() {
  isLoading.value = true;
  try {
    detail.value = await getTicket(String(route.params.id));
  } catch {
    detail.value = null;
  } finally {
    isLoading.value = false;
  }
}

async function submitReply() {
  if (!detail.value || !replyHtml.value.trim()) return;
  isReplying.value = true;
  try {
    detail.value = await replyToTicket(detail.value.ticket.id, replyHtml.value);
    replyHtml.value = "";
  } catch (err) {
    await alert(err instanceof Error ? err.message : t("common.error"));
  } finally {
    isReplying.value = false;
  }
}

onMounted(loadTicket);
</script>
