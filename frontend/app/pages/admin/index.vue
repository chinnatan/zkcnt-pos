<template>
  <div class="space-y-6">
    <div v-if="isLoading" class="flex justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>

    <template v-else-if="overview">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiCraftCard variant="tag" padding="md">
          <p class="text-sm text-ink-muted">{{ t('admin.overview.stores') }}</p>
          <p class="mt-1 font-display text-2xl font-bold text-ink">{{ overview.stores.total }}</p>
          <p class="mt-1 text-xs text-ink-muted">
            {{ t('admin.overview.activeCount', { count: overview.stores.active }) }}
            · +{{ overview.stores.new_7d }} / 7d
          </p>
        </UiCraftCard>

        <UiCraftCard variant="stitched" padding="md">
          <p class="text-sm text-ink-muted">{{ t('admin.overview.users') }}</p>
          <p class="mt-1 font-display text-2xl font-bold text-ink">{{ overview.users.total }}</p>
          <p class="mt-1 text-xs text-ink-muted">+{{ overview.users.new_7d }} / 7d</p>
        </UiCraftCard>

        <UiCraftCard variant="polaroid" padding="sm">
          <p class="text-sm text-ink-muted">{{ t('admin.overview.gmvToday') }}</p>
          <p class="mt-1 font-display text-2xl font-bold text-ink">{{ formatCurrency(overview.orders_today.gmv) }}</p>
          <p class="mt-1 text-xs text-ink-muted">{{ overview.orders_today.count }} {{ t('admin.overview.orders') }}</p>
        </UiCraftCard>

        <UiCraftCard variant="kraft" padding="md">
          <p class="text-sm text-ink-muted">{{ t('admin.overview.gmv7d') }}</p>
          <p class="mt-1 font-display text-2xl font-bold text-ink">{{ formatCurrency(overview.orders_7d.gmv) }}</p>
          <p class="mt-1 text-xs text-ink-muted">{{ overview.orders_7d.count }} {{ t('admin.overview.orders') }}</p>
        </UiCraftCard>
      </div>

      <UiCraftCard v-if="overview.alerts.length > 0" variant="canvas" padding="md">
        <h3 class="mb-3 text-sm font-semibold text-ink">{{ t('admin.overview.alerts') }}</h3>
        <ul class="space-y-2">
          <li
            v-for="alert in overview.alerts"
            :key="alert.type"
            class="rounded-lg px-3 py-2 text-sm"
            :class="alert.severity === 'warning' ? 'bg-warning-50 text-warning-800' : 'bg-surface text-ink-muted'"
          >
            {{ alert.message }}
          </li>
        </ul>
      </UiCraftCard>

      <UiCraftCard variant="paper" padding="md">
        <p class="text-sm text-ink-muted">{{ t('admin.overview.inactiveStores') }}</p>
        <p class="mt-1 text-lg font-semibold text-ink">{{ overview.inactive_stores_7d }}</p>
      </UiCraftCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AdminOverview } from "~/lib/types";

definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const { t } = useI18n();
const { formatCurrency } = useFormat();
const { getOverview } = usePlatformAdmin();

const overview = ref<AdminOverview | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    overview.value = await getOverview();
  } finally {
    isLoading.value = false;
  }
});
</script>
