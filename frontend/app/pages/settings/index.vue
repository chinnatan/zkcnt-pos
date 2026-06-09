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
            @click="openMemberModal"
          >
            {{ memberInviteMode === 'email' ? t('settingsPage.inviteMember') : t('settingsPage.addMember') }}
          </button>
        </div>

        <div v-if="isOwner" class="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p class="mb-3 text-sm font-medium text-gray-700">{{ t('settingsPage.inviteModeTitle') }}</p>
          <div class="space-y-2">
            <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-3" :class="inviteModeForm === 'direct' ? 'border-primary-500 ring-1 ring-primary-500/20' : ''">
              <input v-model="inviteModeForm" type="radio" value="direct" class="mt-1" :disabled="isUpdatingMode" @change="handleModeChange" />
              <div>
                <span class="text-sm font-medium text-gray-800">{{ t('settingsPage.inviteModeDirect') }}</span>
                <p class="text-xs text-gray-500">{{ t('settingsPage.inviteModeDirectHint') }}</p>
              </div>
            </label>
            <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-3" :class="inviteModeForm === 'email' ? 'border-primary-500 ring-1 ring-primary-500/20' : ''">
              <input v-model="inviteModeForm" type="radio" value="email" class="mt-1" :disabled="isUpdatingMode" @change="handleModeChange" />
              <div>
                <span class="text-sm font-medium text-gray-800">{{ t('settingsPage.inviteModeEmail') }}</span>
                <p class="text-xs text-gray-500">{{ t('settingsPage.inviteModeEmailHint') }}</p>
              </div>
            </label>
          </div>
          <p v-if="modeError" class="mt-2 text-sm text-red-600">{{ modeError }}</p>
        </div>

        <div v-if="isLoadingMembers" class="py-6 text-center text-sm text-gray-500">
          {{ t('common.loading') }}
        </div>

        <div v-else-if="membersError" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {{ membersError }}
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="member in storeMembers"
            :key="member.id"
            class="flex items-center justify-between rounded-lg border border-gray-100 p-3"
          >
            <div>
              <p class="text-sm font-medium text-gray-800">
                {{ member.expand?.user?.name || member.expand?.user?.email || t('common.unknown') }}
              </p>
              <p v-if="member.expand?.user?.email" class="text-xs text-gray-500">{{ member.expand.user.email }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="member.role === 'owner' ? 'bg-purple-100 text-purple-700' : member.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'"
              >
                {{ roleLabel(member.role) }}
              </span>
              <button
                v-if="isOwner && member.role !== 'owner'"
                type="button"
                class="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                @click="handleRemoveMember(member.id)"
              >
                {{ t('common.delete') }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="memberInviteMode === 'email' && pendingInvites.length > 0" class="mt-6 border-t border-gray-100 pt-4">
          <h4 class="mb-3 text-sm font-semibold text-gray-700">{{ t('settingsPage.pendingInvites') }}</h4>
          <div class="space-y-2">
            <div
              v-for="invite in pendingInvites"
              :key="invite.id"
              class="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 p-3"
            >
              <div>
                <p class="text-sm font-medium text-gray-800">{{ invite.email }}</p>
                <p class="text-xs text-gray-500">{{ roleLabel(invite.role) }}</p>
              </div>
              <button
                v-if="isManager"
                type="button"
                class="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-white"
                @click="handleCancelInvite(invite.id)"
              >
                {{ t('common.cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showMemberModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showMemberModal = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-semibold">
            {{ memberInviteMode === 'email' ? t('settingsPage.inviteTitle') : t('settingsPage.addMemberTitle') }}
          </h3>

          <div v-if="memberSuccess" class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {{ memberSuccess }}
          </div>
          <div v-if="inviteLink" class="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            <p class="mb-1 font-medium">{{ t('settingsPage.inviteLinkLabel') }}</p>
            <p class="break-all">{{ inviteLink }}</p>
            <button type="button" class="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700" @click="copyInviteLink">
              {{ t('settingsPage.copyInviteLink') }}
            </button>
          </div>
          <div v-if="memberError" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ memberError }}</div>

          <form @submit.prevent="handleAddOrInvite" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.email') }}</label>
              <input v-model="memberEmail" type="email" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" :placeholder="t('settingsPage.memberEmailPlaceholder')" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('common.role') }}</label>
              <select v-model="memberRole" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none">
                <option value="manager">{{ t('roles.manager') }}</option>
                <option value="cashier">{{ t('roles.cashier') }}</option>
              </select>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="closeMemberModal">{{ t('common.cancel') }}</button>
              <button type="submit" :disabled="isSubmittingMember" class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                {{ isSubmittingMember ? t('common.loading') : (memberInviteMode === 'email' ? t('common.invite') : t('settingsPage.addMember')) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { MemberInviteMode } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { roleLabel } = useLabels();
const { $pb } = useNuxtApp();
const { activeStore, activeStoreId, isManager, isOwner } = useStore();
const {
  storeMembers,
  pendingInvites,
  isLoadingMembers,
  membersError,
  memberInviteMode,
  refreshTeamData,
  addOrInvite,
  cancelInvite,
  removeMember,
  updateInviteMode,
} = useStoreMembers();

const isSaving = ref(false);
const showMemberModal = ref(false);
const memberEmail = ref("");
const memberRole = ref<"manager" | "cashier">("cashier");
const memberError = ref("");
const memberSuccess = ref("");
const inviteLink = ref("");
const isSubmittingMember = ref(false);

const inviteModeForm = ref<MemberInviteMode>("direct");
const isUpdatingMode = ref(false);
const modeError = ref("");

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
      inviteModeForm.value = store.settings?.member_invite_mode ?? "direct";
      refreshTeamData(store.id);
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

function openMemberModal() {
  memberError.value = "";
  memberSuccess.value = "";
  inviteLink.value = "";
  memberEmail.value = "";
  memberRole.value = "cashier";
  showMemberModal.value = true;
}

function closeMemberModal() {
  showMemberModal.value = false;
  memberError.value = "";
  memberSuccess.value = "";
  inviteLink.value = "";
}

async function handleModeChange() {
  modeError.value = "";
  isUpdatingMode.value = true;
  try {
    await updateInviteMode(inviteModeForm.value);
  } catch (e: unknown) {
    inviteModeForm.value = memberInviteMode.value;
    modeError.value = e instanceof Error ? e.message : t("errors.updateFailed");
  } finally {
    isUpdatingMode.value = false;
  }
}

async function handleAddOrInvite() {
  memberError.value = "";
  memberSuccess.value = "";
  inviteLink.value = "";
  isSubmittingMember.value = true;

  try {
    const result = await addOrInvite(memberEmail.value, memberRole.value);

    if (memberInviteMode.value === "email" && result && "inviteLink" in result) {
      memberSuccess.value = t("settingsPage.inviteSent");
      inviteLink.value = result.inviteLink;
    } else {
      memberSuccess.value = t("settingsPage.memberAdded");
      setTimeout(() => closeMemberModal(), 1200);
    }
  } catch (e: unknown) {
    const message = getErrorMessage(e) || t("errors.inviteFailed");
    if (message.includes("not registered") || message.includes("User not registered")) {
      memberError.value = t("settingsPage.userNotRegistered");
    } else {
      memberError.value = message;
    }
  } finally {
    isSubmittingMember.value = false;
  }
}

async function handleCancelInvite(id: string) {
  try {
    await cancelInvite(id);
  } catch (e: unknown) {
    memberError.value = e instanceof Error ? e.message : t("errors.updateFailed");
  }
}

async function handleRemoveMember(id: string) {
  if (!confirm(t("settingsPage.confirmRemoveMember"))) return;
  try {
    await removeMember(id);
  } catch (e: unknown) {
    memberError.value = e instanceof Error ? e.message : t("errors.deleteFailed");
  }
}

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object") {
    if ("response" in e) {
      const err = e as { response?: { data?: { message?: string }; message?: string }; message?: string };
      return err.response?.data?.message || err.response?.message || err.message || "";
    }
    if ("message" in e && typeof (e as { message: unknown }).message === "string") {
      return (e as { message: string }).message;
    }
  }
  return e instanceof Error ? e.message : "";
}

async function copyInviteLink() {
  if (!inviteLink.value) return;
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    memberSuccess.value = t("settingsPage.inviteLinkCopied");
  } catch {
    memberSuccess.value = t("settingsPage.inviteLinkCopyFailed");
  }
}
</script>
