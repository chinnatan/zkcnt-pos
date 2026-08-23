<template>
  <div class="space-y-6">
    <div v-if="isLoading" class="flex justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>

    <template v-else-if="health">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiCraftCard variant="tag" padding="md">
          <p class="text-sm text-ink-muted">{{ t('admin.system.apiStatus') }}</p>
          <p class="mt-1 text-xl font-bold text-success-600">{{ health.status }}</p>
          <p class="mt-1 text-xs text-ink-muted">v{{ health.version }} · {{ health.build }}</p>
        </UiCraftCard>

        <UiCraftCard variant="stitched" padding="md">
          <p class="text-sm text-ink-muted">{{ t('admin.system.dbLatency') }}</p>
          <p class="mt-1 text-xl font-bold">{{ health.db.latency_ms }}ms</p>
          <p class="mt-1 text-xs text-ink-muted">D1 {{ health.db.connected ? 'OK' : 'FAIL' }}</p>
        </UiCraftCard>

        <UiCraftCard variant="kraft" padding="md">
          <p class="text-sm text-ink-muted">R2</p>
          <p class="mt-1 text-xl font-bold">{{ health.r2.available ? t('common.online') : t('common.na') }}</p>
        </UiCraftCard>
      </div>

      <UiCraftCard variant="canvas" padding="md">
        <h3 class="mb-3 font-semibold">{{ t('admin.system.rowCounts') }}</h3>
        <dl class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="(count, table) in health.db.row_counts" :key="table" class="flex justify-between rounded bg-surface px-3 py-2 text-sm">
            <dt class="text-ink-muted">{{ table }}</dt>
            <dd class="font-medium">{{ count }}</dd>
          </div>
        </dl>
      </UiCraftCard>

      <UiCraftCard variant="paper" padding="md">
        <h3 class="mb-3 font-semibold">{{ t('admin.system.cron') }}</h3>
        <ul class="space-y-1 text-sm">
          <li>{{ t('admin.system.backup') }}: {{ health.cron.backup_last_run || '—' }}</li>
          <li>{{ t('admin.system.healthWarmup') }}: {{ health.cron.health_warmup_last_run || '—' }}</li>
        </ul>
      </UiCraftCard>

      <UiCraftCard v-if="health.metrics" variant="ticket" padding="md">
        <h3 class="mb-3 font-semibold">{{ t('admin.system.metrics24h') }}</h3>
        <dl class="grid gap-2 sm:grid-cols-3 text-sm">
          <div><dt class="text-ink-muted">{{ t('admin.system.loginFailed') }}</dt><dd class="font-bold">{{ health.metrics.login_failed }}</dd></div>
          <div><dt class="text-ink-muted">{{ t('admin.system.loginSuccess') }}</dt><dd class="font-bold">{{ health.metrics.login_success }}</dd></div>
          <div><dt class="text-ink-muted">{{ t('admin.system.registrations') }}</dt><dd class="font-bold">{{ health.metrics.registrations }}</dd></div>
        </dl>
        <p class="mt-2 text-xs text-ink-muted">{{ health.metrics.recorded_at }}</p>
      </UiCraftCard>

      <UiCraftCard variant="label" padding="md">
        <h3 class="mb-2 font-semibold">{{ t('admin.system.external') }}</h3>
        <a
          href="https://dash.cloudflare.com"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary-600 hover:underline"
        >
          Cloudflare Dashboard → Workers Logs & Traces
        </a>
      </UiCraftCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AdminHealth } from "~/lib/types";

definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const { t } = useI18n();
const { getHealth } = usePlatformAdmin();

const health = ref<AdminHealth | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    health.value = await getHealth();
  } finally {
    isLoading.value = false;
  }
});
</script>
