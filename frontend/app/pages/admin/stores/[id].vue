<template>
  <div class="space-y-6">
    <div v-if="isLoading" class="flex justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>

    <template v-else-if="detail">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <NuxtLink to="/admin/stores" class="text-sm text-primary-600 hover:underline">← {{ t('admin.nav.stores') }}</NuxtLink>
          <h3 class="mt-1 text-xl font-semibold text-ink">{{ detail.store.name }}</h3>
          <p class="text-sm text-ink-muted">{{ detail.store.slug }} · {{ detail.owner?.email }}</p>
        </div>
        <button
          class="rounded-lg px-4 py-2 text-sm font-medium"
          :class="detail.store.is_active ? 'bg-danger-50 text-danger-700 hover:bg-danger-100' : 'bg-success-50 text-success-700 hover:bg-success-100'"
          :disabled="isSaving"
          @click="toggleActive"
        >
          {{ detail.store.is_active ? t('admin.storeDetail.deactivate') : t('admin.storeDetail.activate') }}
        </button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UiCraftCard variant="tag" padding="md">
          <p class="text-xs text-ink-muted">{{ t('admin.storeDetail.orders') }}</p>
          <p class="text-xl font-bold">{{ detail.stats.orders }}</p>
        </UiCraftCard>
        <UiCraftCard variant="stitched" padding="md">
          <p class="text-xs text-ink-muted">GMV</p>
          <p class="text-xl font-bold">{{ formatCurrency(detail.stats.gmv) }}</p>
        </UiCraftCard>
        <UiCraftCard variant="paper" padding="md">
          <p class="text-xs text-ink-muted">{{ t('nav.products') }}</p>
          <p class="text-xl font-bold">{{ detail.stats.products }}</p>
        </UiCraftCard>
        <UiCraftCard variant="kraft" padding="md">
          <p class="text-xs text-ink-muted">{{ t('nav.customers') }}</p>
          <p class="text-xl font-bold">{{ detail.stats.customers }}</p>
        </UiCraftCard>
      </div>

      <UiCraftCard variant="canvas" padding="md">
        <h4 class="mb-3 font-semibold text-ink">{{ t('admin.storeDetail.members') }}</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-xs uppercase text-ink-muted">
              <tr>
                <th class="pb-2">{{ t('common.nameRequired').replace(' *', '') }}</th>
                <th class="pb-2">{{ t('common.email') }}</th>
                <th class="pb-2">{{ t('common.role') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-warm">
              <tr v-for="m in detail.members" :key="m.id">
                <td class="py-2">{{ m.name }}</td>
                <td class="py-2 text-ink-muted">{{ m.email }}</td>
                <td class="py-2">{{ m.role }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCraftCard>

      <UiCraftCard variant="ticket" padding="md">
        <h4 class="mb-3 font-semibold text-ink">{{ t('admin.storeDetail.featureFlags') }}</h4>
        <div class="space-y-3">
          <label v-for="flag in featureFlagOptions" :key="flag.key" class="flex items-center justify-between gap-4">
            <span class="text-sm text-ink">{{ flag.label }}</span>
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-border-warm"
              :checked="featureFlags[flag.key] !== false"
              @change="toggleFlag(flag.key, ($event.target as HTMLInputElement).checked)"
            />
          </label>
        </div>
        <button class="btn-primary mt-4" :disabled="isSaving" @click="saveFeatureFlags">
          {{ t('common.save') }}
        </button>
      </UiCraftCard>

      <UiCraftCard variant="paper" padding="md">
        <h4 class="mb-3 font-semibold text-ink">{{ t('admin.storeDetail.recentActivity') }}</h4>
        <ul class="space-y-2 text-sm">
          <li v-for="event in detail.recent_audit" :key="event.id" class="border-b border-border-warm pb-2">
            <span class="text-ink-muted">{{ formatDate(event.created) }}</span>
            · {{ event.action }} — {{ event.summary }}
          </li>
        </ul>
      </UiCraftCard>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const route = useRoute();
const { t } = useI18n();
const { formatCurrency, formatDate } = useFormat();
const { getStore, patchStore } = usePlatformAdmin();

const storeId = computed(() => route.params.id as string);
const detail = ref<Awaited<ReturnType<ReturnType<typeof usePlatformAdmin>["getStore"]>> | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const featureFlags = ref<Record<string, boolean>>({});

const featureFlagOptions = computed(() => [
  { key: "promotions_enabled", label: t("admin.featureFlags.promotions") },
  { key: "reports_enabled", label: t("admin.featureFlags.reports") },
  { key: "offline_sync_enabled", label: t("admin.featureFlags.offlineSync") },
]);

async function loadDetail() {
  isLoading.value = true;
  try {
    detail.value = await getStore(storeId.value);
    featureFlags.value = { ...detail.value.feature_flags };
  } finally {
    isLoading.value = false;
  }
}

async function toggleActive() {
  if (!detail.value) return;
  isSaving.value = true;
  try {
    detail.value = await patchStore(storeId.value, {
      is_active: !detail.value.store.is_active,
    }) as typeof detail.value;
  } finally {
    isSaving.value = false;
  }
}

function toggleFlag(key: string, enabled: boolean) {
  featureFlags.value = { ...featureFlags.value, [key]: enabled };
}

async function saveFeatureFlags() {
  isSaving.value = true;
  try {
    detail.value = await patchStore(storeId.value, {
      feature_flags: featureFlags.value,
    }) as typeof detail.value;
    featureFlags.value = { ...detail.value.feature_flags };
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadDetail);
</script>
