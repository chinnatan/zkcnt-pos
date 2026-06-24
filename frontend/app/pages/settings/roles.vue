<template>
  <div class="space-y-6">
    <div>
      <NuxtLink to="/settings" class="text-sm text-primary-600 hover:underline">
        ← {{ t('settingsPage.title') }}
      </NuxtLink>
      <h2 class="mt-1 text-lg font-semibold text-ink">{{ t('rolesPage.title') }}</h2>
    </div>

    <div v-if="!isOnline" class="rounded-xl bg-warning-50 p-4 text-sm text-warning-700">
      {{ t('rolesPage.offlineHint') }}
    </div>

    <UiCraftCard variant="paper" padding="md">
      <h3 class="mb-1 text-base font-semibold text-ink">{{ t('rolesPage.matrixTitle') }}</h3>
      <p class="mb-4 text-sm text-ink-muted">{{ t('rolesPage.matrixHint') }}</p>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-border-warm text-left text-xs uppercase text-ink-muted">
              <th class="pb-3 pr-4 font-medium">{{ t('rolesPage.permissionColumn') }}</th>
              <th
                v-for="role in STORE_ROLES"
                :key="role"
                class="pb-3 px-3 text-center font-medium"
              >
                {{ roleLabel(role) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in matrixRows"
              :key="row.key"
              :class="row.type === 'group' ? 'bg-surface/60' : 'border-b border-border-warm/60'"
            >
              <template v-if="row.type === 'group'">
                <td
                  colspan="4"
                  class="px-1 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted"
                >
                  {{ permissionGroupLabel(row.group) }}
                </td>
              </template>
              <template v-else>
                <td class="py-3 pr-4 text-ink">
                  {{ permissionLabel(row.permission.id) }}
                </td>
                <td
                  v-for="role in STORE_ROLES"
                  :key="`${row.permission.id}-${role}`"
                  class="px-3 py-3 text-center"
                >
                  <span
                    class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                    :class="roleHasPermission(role, row.permission.tier)
                      ? 'bg-success-50 text-success-700'
                      : 'bg-surface text-ink-muted'"
                    :aria-label="roleHasPermission(role, row.permission.tier) ? t('rolesPage.allowed') : t('rolesPage.denied')"
                  >
                    {{ roleHasPermission(role, row.permission.tier) ? '✓' : '✗' }}
                  </span>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCraftCard>

    <UiCraftCard variant="stitched" padding="md">
      <h3 class="mb-4 text-base font-semibold text-ink">{{ t('rolesPage.membersTitle') }}</h3>

      <div v-if="isLoadingMembers" class="py-6 text-center text-sm text-ink-muted">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="membersError" class="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
        {{ membersError }}
      </div>

      <div v-else-if="storeMembers.length === 0" class="py-6 text-center text-sm text-ink-muted">
        {{ t('rolesPage.noMembers') }}
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="member in storeMembers"
          :key="member.id"
          class="flex flex-col gap-3 rounded-lg border border-border-warm p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="text-sm font-medium text-ink">
              {{ member.expand?.user?.name || member.expand?.user?.email || t('common.unknown') }}
            </p>
            <p v-if="member.expand?.user?.email" class="text-xs text-ink-muted">
              {{ member.expand.user.email }}
            </p>
          </div>

          <div v-if="member.role === 'owner'" class="flex items-center">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="memberRoleBadge(member.role)"
            >
              {{ roleLabel(member.role) }}
            </span>
          </div>

          <div v-else class="flex flex-wrap items-center gap-2">
            <select
              v-model="roleDrafts[member.id]"
              class="rounded-lg border border-border-warm px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              :disabled="!isOnline || savingMemberId === member.id"
            >
              <option value="manager">{{ t('roles.manager') }}</option>
              <option value="cashier">{{ t('roles.cashier') }}</option>
            </select>
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              :disabled="!isOnline || savingMemberId === member.id || roleDrafts[member.id] === member.role"
              @click="handleRoleChange(member)"
            >
              {{ savingMemberId === member.id ? t('common.saving') : t('rolesPage.changeRole') }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="roleError" class="mt-3 text-sm text-danger-500">{{ roleError }}</p>
      <p v-if="roleSuccess" class="mt-3 text-sm text-accent-700">{{ roleSuccess }}</p>
    </UiCraftCard>
  </div>
</template>

<script setup lang="ts">
import type { StoreMember } from "~/lib/types";
import {
  PERMISSION_GROUPS,
  permissionsByGroup,
  roleHasPermission,
  STORE_ROLES,
  type PermissionGroup,
} from "~/lib/roles/permissions";
import { memberRoleBadge } from "~/lib/ui/statusColors";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { isOwner } = useStore();
const { isOnline } = useOnlineStatus();
const { roleLabel, permissionLabel, permissionGroupLabel } = useLabels();
const { confirm } = useDialog();
const {
  storeMembers,
  isLoadingMembers,
  membersError,
  refreshTeamData,
  updateMemberRole,
} = useStoreMembers();

const roleDrafts = reactive<Record<string, "manager" | "cashier">>({});
const savingMemberId = ref<string | null>(null);
const roleError = ref<string | null>(null);
const roleSuccess = ref<string | null>(null);

const matrixRows = computed(() => {
  const rows: Array<
    | { type: "group"; key: string; group: PermissionGroup }
    | { type: "permission"; key: string; permission: ReturnType<typeof permissionsByGroup>[number] }
  > = [];

  for (const group of PERMISSION_GROUPS) {
    rows.push({ type: "group", key: `group-${group}`, group });
    for (const permission of permissionsByGroup(group)) {
      rows.push({ type: "permission", key: permission.id, permission });
    }
  }

  return rows;
});

watch(
  storeMembers,
  (members) => {
    for (const member of members) {
      if (member.role === "manager" || member.role === "cashier") {
        roleDrafts[member.id] = member.role;
      }
    }
  },
  { immediate: true },
);

async function handleRoleChange(member: StoreMember) {
  const nextRole = roleDrafts[member.id];
  if (!nextRole || nextRole === member.role) return;

  const memberName =
    member.expand?.user?.name || member.expand?.user?.email || t("common.unknown");
  const confirmed = await confirm(
    t("rolesPage.confirmChangeRole", {
      name: memberName,
      role: roleLabel(nextRole),
    }),
  );
  if (!confirmed) {
    roleDrafts[member.id] = member.role as "manager" | "cashier";
    return;
  }

  savingMemberId.value = member.id;
  roleError.value = null;
  roleSuccess.value = null;

  try {
    await updateMemberRole(member.id, nextRole);
    roleSuccess.value = t("rolesPage.roleUpdated");
  } catch (e: unknown) {
    roleError.value = e instanceof Error ? e.message : t("errors.updateFailed");
    roleDrafts[member.id] = member.role as "manager" | "cashier";
  } finally {
    savingMemberId.value = null;
  }
}

onMounted(async () => {
  if (!isOwner.value) {
    await navigateTo("/settings");
    return;
  }
  await refreshTeamData();
});
</script>
