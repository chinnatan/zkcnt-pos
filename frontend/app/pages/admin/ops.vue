<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-ink">{{ t('admin.ops.title') }}</h2>

    <div v-if="isLoading" class="flex justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>

    <template v-else-if="ops">
      <UiCraftCard variant="paper" padding="md">
        <h3 class="mb-3 text-sm font-semibold text-ink">{{ t('admin.ops.onboarding') }}</h3>
        <p v-if="ops.onboarding.length === 0" class="text-sm text-ink-muted">{{ t('admin.ops.onboardingEmpty') }}</p>
        <ul v-else class="space-y-2">
          <li v-for="item in ops.onboarding" :key="item.store_id" class="rounded-lg bg-surface px-3 py-2 text-sm">
            <NuxtLink :to="`/admin/stores/${item.store_id}`" class="font-medium text-primary-700 hover:underline">
              {{ item.store_name }}
            </NuxtLink>
            <span class="text-ink-muted"> · {{ item.issues.map(issueLabel).join(', ') }}</span>
          </li>
        </ul>
      </UiCraftCard>

      <UiCraftCard variant="stitched" padding="md">
        <h3 class="mb-2 text-sm font-semibold text-ink">{{ t('admin.ops.backup') }}</h3>
        <p class="text-sm text-ink-muted">
          {{ t('admin.ops.backupLastRun') }}:
          {{ ops.backup_last_run ? formatDate(ops.backup_last_run) : t('admin.ops.backupNever') }}
        </p>
      </UiCraftCard>

      <UiCraftCard variant="canvas" padding="md">
        <h3 class="mb-3 text-sm font-semibold text-ink">{{ t('admin.ops.syncHealth') }}</h3>
        <div v-if="ops.sync_alerts.length === 0" class="text-sm text-ink-muted">—</div>
        <ul v-else class="space-y-2">
          <li v-for="alert in ops.sync_alerts" :key="alert.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
            <div>
              <NuxtLink :to="`/admin/stores/${alert.store}`" class="font-medium text-primary-700 hover:underline">
                {{ alert.store_name }}
              </NuxtLink>
              <span class="text-ink-muted"> · user {{ alert.user }}</span>
            </div>
            <span class="font-semibold text-warning-700">{{ alert.pending_sync_count }} {{ t('admin.devices.syncPending') }}</span>
          </li>
        </ul>
        <NuxtLink to="/admin/devices" class="mt-3 inline-block text-sm text-primary-700 hover:underline">
          {{ t('admin.nav.devices') }} →
        </NuxtLink>
      </UiCraftCard>

      <UiCraftCard variant="kraft" padding="md">
        <h3 class="mb-3 text-sm font-semibold text-ink">{{ t('admin.ops.platformConfig') }}</h3>
        <div class="space-y-3">
          <div v-for="item in configItems" :key="item.key" class="rounded-lg border border-border-warm p-3 text-sm">
            <p class="font-mono text-xs text-ink-muted">{{ item.key }}</p>
            <p class="mt-1 break-all">{{ item.value }}</p>
          </div>
        </div>
        <form class="mt-4 flex flex-col gap-2 sm:flex-row" @submit.prevent="saveConfig">
          <input v-model="configKey" :placeholder="t('admin.ops.configKey')" class="input flex-1" />
          <input v-model="configValue" :placeholder="t('admin.ops.configValue')" class="input flex-1" />
          <button type="submit" class="btn-primary" :disabled="isSavingConfig">{{ t('admin.ops.configSave') }}</button>
        </form>
      </UiCraftCard>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const { t } = useI18n();
const { formatDate } = useFormat();
const { alert } = useDialog();
const { getOpsOverview, listPlatformConfig, savePlatformConfig } = usePlatformAdmin();

const ops = ref<Awaited<ReturnType<typeof getOpsOverview>> | null>(null);
const configItems = ref<Array<{ key: string; value: string; updated: string }>>([]);
const isLoading = ref(true);
const configKey = ref("");
const configValue = ref("");
const isSavingConfig = ref(false);

function issueLabel(issue: string) {
  if (issue === "no_products") return t("admin.ops.noProducts");
  if (issue === "no_orders") return t("admin.ops.noOrders");
  return issue;
}

async function load() {
  isLoading.value = true;
  try {
    const [opsData, config] = await Promise.all([getOpsOverview(), listPlatformConfig()]);
    ops.value = opsData;
    configItems.value = config.items;
  } finally {
    isLoading.value = false;
  }
}

async function saveConfig() {
  if (!configKey.value.trim()) return;
  isSavingConfig.value = true;
  try {
    await savePlatformConfig(configKey.value.trim(), configValue.value);
    configKey.value = "";
    configValue.value = "";
    const config = await listPlatformConfig();
    configItems.value = config.items;
  } catch (err) {
    await alert(err instanceof Error ? err.message : t("common.error"));
  } finally {
    isSavingConfig.value = false;
  }
}

onMounted(load);
</script>
