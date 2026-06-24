<template>
  <UiCraftCard variant="ticket" padding="md">
    <div v-if="isLoading" class="py-8 text-center text-sm text-ink-muted">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="loadError" class="rounded-lg bg-danger-50 p-4 text-sm text-danger-700">
      {{ loadError }}
    </div>

    <div v-else-if="inviteInfo">
      <h2 class="mb-2 text-center text-xl font-semibold text-ink">{{ t('invitePage.title') }}</h2>
      <p class="mb-6 text-center text-sm text-ink-muted">{{ t('invitePage.subtitle', { store: inviteInfo.storeName }) }}</p>

      <div class="mb-6 space-y-2 rounded-lg bg-surface p-4 text-sm">
        <div class="flex justify-between">
          <span class="text-ink-muted">{{ t('common.email') }}</span>
          <span class="font-medium text-ink">{{ inviteInfo.email }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-ink-muted">{{ t('common.role') }}</span>
          <span class="font-medium text-ink">{{ roleLabel(inviteInfo.role) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-ink-muted">{{ t('common.status') }}</span>
          <span class="font-medium text-ink">{{ inviteInfo.status }}</span>
        </div>
      </div>

      <div v-if="inviteInfo.status !== 'pending'" class="rounded-lg bg-warning-50 p-4 text-sm text-warning-700">
        {{ inviteInfo.status === 'expired' ? t('invitePage.expired') : t('invitePage.noLongerValid') }}
      </div>

      <template v-else>
        <div v-if="actionError" class="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{{ actionError }}</div>

        <div v-if="!isAuthenticated" class="space-y-3">
          <p class="text-center text-sm text-ink-muted">{{ t('invitePage.signInPrompt') }}</p>
          <NuxtLink
            :to="registerLink"
            class="block w-full rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-700"
          >
            {{ t('auth.createAccount') }}
          </NuxtLink>
          <NuxtLink
            :to="loginLink"
            class="block w-full rounded-lg border border-border-warm px-4 py-2.5 text-center text-sm font-medium text-ink hover:bg-surface"
          >
            {{ t('auth.signInLink') }}
          </NuxtLink>
        </div>

        <div v-else-if="emailMismatch" class="rounded-lg bg-danger-50 p-4 text-sm text-danger-700">
          {{ t('invitePage.emailMismatch', { email: inviteInfo.email }) }}
        </div>

        <button
          v-else
          type="button"
          :disabled="isAccepting"
          class="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          @click="handleAccept"
        >
          {{ isAccepting ? t('common.loading') : t('invitePage.accept') }}
        </button>
      </template>
    </div>
  </UiCraftCard>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth" });

const { t } = useI18n();
const { roleLabel } = useLabels();
const route = useRoute();
const { isAuthenticated, authUser, initAuth } = useAuth();
const { fetchUserStores } = useStore();
const { lookupInvite, acceptInvite } = useStoreMembers();

const token = computed(() => String(route.params.token || ""));
const isLoading = ref(true);
const isAccepting = ref(false);
const loadError = ref("");
const actionError = ref("");

const inviteInfo = ref<{
  storeName: string;
  email: string;
  role: "manager" | "cashier";
  status: string;
  expires: string;
} | null>(null);

const registerLink = computed(() => {
  const email = inviteInfo.value?.email ?? "";
  return `/register?email=${encodeURIComponent(email)}&invite=${encodeURIComponent(token.value)}`;
});

const loginLink = computed(() => {
  return `/login?redirect=${encodeURIComponent(route.fullPath)}`;
});

const emailMismatch = computed(() => {
  if (!inviteInfo.value || !authUser.value) return false;
  return (authUser.value.email || "").toLowerCase() !== inviteInfo.value.email.toLowerCase();
});

onMounted(async () => {
  initAuth();
  await loadInvite();
});

async function loadInvite() {
  isLoading.value = true;
  loadError.value = "";

  try {
    inviteInfo.value = await lookupInvite(token.value);
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : t("invitePage.notFound");
    inviteInfo.value = null;
  } finally {
    isLoading.value = false;
  }
}

async function handleAccept() {
  actionError.value = "";
  isAccepting.value = true;

  try {
    await acceptInvite(token.value);
    await fetchUserStores();
    await navigateTo("/stores");
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t("invitePage.acceptFailed");
    if (message.toLowerCase().includes("email")) {
      actionError.value = t("invitePage.emailMismatch", { email: inviteInfo.value?.email ?? "" });
    } else if (message.toLowerCase().includes("expired")) {
      actionError.value = t("invitePage.expired");
    } else {
      actionError.value = message;
    }
  } finally {
    isAccepting.value = false;
  }
}
</script>
