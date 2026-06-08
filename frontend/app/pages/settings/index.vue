<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-gray-800">{{ t('settingsPage.title') }}</h2>

    <div v-if="!activeStore" class="rounded-xl bg-white p-8 text-center shadow-sm">
      <p class="text-gray-500">{{ t('settingsPage.noStore') }}</p>
    </div>

    <div v-else class="space-y-6">
      <div class="rounded-xl bg-white p-6 shadow-sm">
        <h3 class="mb-4 text-base font-semibold text-gray-800">{{ t('settingsPage.storeInfo') }}</h3>
        <form @submit.prevent="saveStoreInfo" class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('settingsPage.storeName') }}</label>
              <input v-model="storeForm.name" type="text" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.phone') }}</label>
              <input v-model="storeForm.phone" type="tel" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.address') }}</label>
            <textarea v-model="storeForm.address" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('settingsPage.taxId') }}</label>
            <input v-model="storeForm.tax_id" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" :placeholder="t('settingsPage.taxIdPlaceholder')" />
          </div>
          <button type="submit" :disabled="isSaving" class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {{ isSaving ? t('common.saving') : t('settingsPage.saveChanges') }}
          </button>
        </form>
      </div>

      <div class="rounded-xl bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-800">{{ t('settingsPage.teamMembers') }}</h3>
          <button
            v-if="isManager"
            class="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            @click="showInviteModal = true"
          >
            {{ t('settingsPage.inviteMember') }}
          </button>
        </div>

        <div class="space-y-2">
          <div
            v-for="member in userMemberships"
            :key="member.id"
            class="flex items-center justify-between rounded-lg border border-gray-100 p-3"
          >
            <div>
              <span class="text-sm font-medium text-gray-800">{{ member.user }}</span>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="member.role === 'owner' ? 'bg-purple-100 text-purple-700' : member.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'"
            >
              {{ roleLabel(member.role) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showInviteModal = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-semibold">{{ t('settingsPage.inviteTitle') }}</h3>
          <div v-if="inviteError" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ inviteError }}</div>
          <form @submit.prevent="handleInvite" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.email') }}</label>
              <input v-model="inviteEmail" type="email" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" :placeholder="t('settingsPage.memberEmailPlaceholder')" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.role') }}</label>
              <select v-model="inviteRole" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none">
                <option value="manager">{{ t('roles.manager') }}</option>
                <option value="cashier">{{ t('roles.cashier') }}</option>
              </select>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showInviteModal = false">{{ t('common.cancel') }}</button>
              <button type="submit" class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">{{ t('common.invite') }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { roleLabel } = useLabels();
const { $pb } = useNuxtApp();
const { activeStore, activeStoreId, isManager, userMemberships, inviteMember } = useStore();

const isSaving = ref(false);
const showInviteModal = ref(false);
const inviteEmail = ref("");
const inviteRole = ref<"manager" | "cashier">("cashier");
const inviteError = ref("");

const storeForm = reactive({
  name: "",
  phone: "",
  address: "",
  tax_id: "",
});

watch(
  activeStore,
  (store) => {
    if (store) {
      storeForm.name = store.name || "";
      storeForm.phone = store.phone || "";
      storeForm.address = store.address || "";
      storeForm.tax_id = store.tax_id || "";
    }
  },
  { immediate: true },
);

async function saveStoreInfo() {
  if (!activeStoreId.value) return;
  isSaving.value = true;
  try {
    await $pb.collection("stores").update(activeStoreId.value, storeForm);
  } finally {
    isSaving.value = false;
  }
}

async function handleInvite() {
  inviteError.value = "";
  try {
    await inviteMember(inviteEmail.value, inviteRole.value);
    showInviteModal.value = false;
    inviteEmail.value = "";
  } catch (e: any) {
    inviteError.value = e?.message || t("errors.inviteFailed");
  }
}
</script>
