<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-ink-muted">{{ t('auditPage.search') }}</label>
        <input
          v-model="search"
          type="search"
          class="input w-64"
          :placeholder="t('admin.users.searchPlaceholder')"
          @keyup.enter="loadUsers"
        />
      </div>
      <button class="btn-primary" @click="loadUsers">{{ t('auditPage.search') }}</button>
    </div>

    <div class="rounded-xl bg-paper shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border-warm bg-surface text-xs uppercase text-ink-muted">
            <tr>
              <th class="px-4 py-3">{{ t('common.nameRequired').replace(' *', '') }}</th>
              <th class="px-4 py-3">{{ t('common.email') }}</th>
              <th class="px-4 py-3">{{ t('admin.users.stores') }}</th>
              <th class="px-4 py-3">{{ t('common.status') }}</th>
              <th class="px-4 py-3">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-warm">
            <tr v-for="user in users" :key="user.id" class="hover:bg-surface">
              <td class="px-4 py-3 font-medium">
                {{ user.name }}
                <span v-if="user.is_platform_admin" class="ml-2 rounded bg-primary-100 px-1.5 py-0.5 text-xs text-primary-700">Admin</span>
              </td>
              <td class="px-4 py-3 text-ink-muted">{{ user.email }}</td>
              <td class="px-4 py-3">{{ user.store_count }}</td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="user.is_active !== false ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'"
                >
                  {{ user.is_active !== false ? t('common.active') : t('common.inactive') }}
                </span>
              </td>
              <td class="px-4 py-3">
                <NuxtLink :to="`/admin/users/${user.id}`" class="text-primary-600 hover:underline">
                  {{ t('common.view') }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminUserListItem } from "~/lib/types";

definePageMeta({ middleware: ["auth", "platform-admin"], layout: "admin" });

const { t } = useI18n();
const { listUsers } = usePlatformAdmin();

const users = ref<AdminUserListItem[]>([]);
const isLoading = ref(true);
const search = ref("");

async function loadUsers() {
  isLoading.value = true;
  try {
    const result = await listUsers({ search: search.value || undefined, limit: 200 });
    users.value = result.items;
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadUsers);
</script>
