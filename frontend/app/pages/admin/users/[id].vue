<template>
  <div class="space-y-6">
    <div v-if="isLoading" class="flex justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>

    <template v-else-if="detail">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <NuxtLink to="/admin/users" class="text-sm text-primary-600 hover:underline">← {{ t('admin.nav.users') }}</NuxtLink>
          <h3 class="mt-1 text-xl font-semibold text-ink">{{ detail.user.name }}</h3>
          <p class="text-sm text-ink-muted">{{ detail.user.email }}</p>
        </div>
        <button
          v-if="!detail.user.is_platform_admin"
          class="rounded-lg px-4 py-2 text-sm font-medium"
          :class="detail.user.is_active !== false ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'"
          :disabled="isSaving"
          @click="toggleActive"
        >
          {{ detail.user.is_active !== false ? t('admin.userDetail.disable') : t('admin.userDetail.enable') }}
        </button>
      </div>

      <UiCraftCard variant="canvas" padding="md">
        <h4 class="mb-3 font-semibold">{{ t('admin.userDetail.memberships') }}</h4>
        <table class="w-full text-sm">
          <thead class="text-left text-xs uppercase text-ink-muted">
            <tr>
              <th class="pb-2">{{ t('admin.stores.name') }}</th>
              <th class="pb-2">{{ t('common.role') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-warm">
            <tr v-for="m in detail.memberships" :key="m.id">
              <td class="py-2">
                <NuxtLink :to="`/admin/stores/${m.store}`" class="text-primary-600 hover:underline">
                  {{ m.store_name }}
                </NuxtLink>
              </td>
              <td class="py-2">{{ m.role }}</td>
            </tr>
          </tbody>
        </table>
      </UiCraftCard>

      <UiCraftCard variant="paper" padding="md">
        <h4 class="mb-3 font-semibold">{{ t('admin.userDetail.authEvents') }}</h4>
        <ul class="space-y-2 text-sm">
          <li v-for="event in detail.auth_events" :key="event.id">
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
const { formatDate } = useFormat();
const { getUser, patchUser } = usePlatformAdmin();

const userId = computed(() => route.params.id as string);
const detail = ref<Awaited<ReturnType<ReturnType<typeof usePlatformAdmin>["getUser"]>> | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);

async function loadDetail() {
  isLoading.value = true;
  try {
    detail.value = await getUser(userId.value);
  } finally {
    isLoading.value = false;
  }
}

async function toggleActive() {
  if (!detail.value) return;
  isSaving.value = true;
  try {
    const next = detail.value.user.is_active !== false ? false : true;
    detail.value = await patchUser(userId.value, { is_active: next }) as typeof detail.value;
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadDetail);
</script>
