<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <NuxtLink to="/support" class="text-sm text-primary-700 hover:underline">← {{ t('support.backToList') }}</NuxtLink>
      <h2 class="mt-2 text-lg font-semibold text-ink">{{ t('support.newTicket') }}</h2>
    </div>

    <UiCraftCard variant="paper" padding="md">
      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('support.subject') }}</label>
          <input
            v-model="subject"
            type="text"
            required
            maxlength="200"
            class="input w-full"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('support.category') }}</label>
          <select v-model="category" class="input w-full">
            <option v-for="c in categories" :key="c" :value="c">{{ categoryLabel(c) }}</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-ink">{{ t('support.message') }}</label>
          <ClientOnly>
            <UiRichTextEditor
              v-model="bodyHtml"
              :placeholder="t('support.messagePlaceholder')"
            />
          </ClientOnly>
        </div>

        <div class="flex justify-end gap-2">
          <NuxtLink to="/support" class="btn-secondary">{{ t('common.cancel') }}</NuxtLink>
          <button type="submit" class="btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? t('common.saving') : t('support.submit') }}
          </button>
        </div>
      </form>
    </UiCraftCard>
  </div>
</template>

<script setup lang="ts">
import type { SupportTicketCategory } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const router = useRouter();
const { alert } = useDialog();
const { createTicket } = useSupportTickets();
const { categoryLabel } = useSupportTicketLabels();

const categories: SupportTicketCategory[] = ["bug", "question", "feature", "billing", "other"];
const subject = ref("");
const category = ref<SupportTicketCategory>("bug");
const bodyHtml = ref("");
const isSubmitting = ref(false);

async function submit() {
  if (!subject.value.trim() || !bodyHtml.value.trim()) {
    await alert(t("support.validationRequired"));
    return;
  }
  isSubmitting.value = true;
  try {
    const result = await createTicket({
      subject: subject.value,
      body_html: bodyHtml.value,
      category: category.value,
    });
    await router.push(`/support/${result.ticket.id}`);
  } catch (err) {
    await alert(err instanceof Error ? err.message : t("common.error"));
  } finally {
    isSubmitting.value = false;
  }
}
</script>
