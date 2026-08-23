<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('auditPage.search') }}</label>
        <input
          v-model="search"
          type="search"
          class="input w-64"
          :placeholder="t('admin.stores.searchPlaceholder')"
          @keyup.enter="loadStores"
        />
      </div>
      <button class="btn-primary" @click="loadStores">{{ t('auditPage.search') }}</button>
    </div>

    <div class="rounded-xl bg-paper shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border-warm bg-surface text-xs uppercase text-ink-muted">
            <tr>
              <th class="px-4 py-3">{{ t('admin.stores.name') }}</th>
              <th class="px-4 py-3">{{ t('admin.stores.owner') }}</th>
              <th class="px-4 py-3">{{ t('admin.stores.members') }}</th>
              <th class="px-4 py-3">{{ t('admin.stores.lastOrder') }}</th>
              <th class="px-4 py-3">{{ t('common.status') }}</th>
              <th class="px-4 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-warm">
            <tr v-for="store in stores" :key="store.id" class="hover:bg-surface">
              <td class="px-4 py-3 font-medium">{{ store.name }}</td>
              <td class="px-4 py-3 text-ink-muted">{{ store.owner_email }}</td>
              <td class="px-4 py-3">{{ store.member_count }}</td>
              <td class="px-4 py-3 text-ink-muted">{{ store.last_order_at ? formatDate(store.last_order_at) : '—' }}</td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="store.is_active ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'"
                >
                  {{ store.is_active ? t('common.active') : t('common.inactive') }}
                </span>
              </td>
              <td class="px-4 py-3">
                <NuxtLink :to="`/admin/stores/${store.id}`" class="text-primary-600 hover:underline">
                  {{ t('common.view') }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!isLoading" class="border-t border-border-warm p-4 text-center text-sm text-ink-muted">
        {{ t('auditPage.showing', { shown: stores.length, total: totalItems }) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminStoreListItem } from "~/lib/types";

definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const { t } = useI18n();
const { formatDate } = useFormat();
const { listStores } = usePlatformAdmin();

const stores = ref<AdminStoreListItem[]>([]);
const totalItems = ref(0);
const isLoading = ref(true);
const search = ref("");

async function loadStores() {
  isLoading.value = true;
  try {
    const result = await listStores({ search: search.value || undefined, limit: 200 });
    stores.value = result.items;
    totalItems.value = result.totalItems;
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadStores);
</script>
