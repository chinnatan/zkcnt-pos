<template>
  <UiCraftCard variant="kraft" padding="md">
    <h2 class="mb-6 text-center text-xl font-semibold text-ink">{{ t('auth.createAccount') }}</h2>

    <div v-if="error" class="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </div>

    <form @submit.prevent="handleRegister" class="space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('auth.name') }}</label>
        <input
          v-model="name"
          type="text"
          required
          class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          :placeholder="t('auth.namePlaceholder')"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.email') }}</label>
        <input
          v-model="email"
          type="email"
          required
          :readonly="!!inviteToken"
          class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-surface"
          :placeholder="t('auth.emailPlaceholder')"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.password') }}</label>
        <input
          v-model="password"
          type="password"
          required
          minlength="8"
          class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          :placeholder="t('auth.passwordMinPlaceholder')"
        />
      </div>
      <button
        type="submit"
        :disabled="isLoading"
        class="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50"
      >
        {{ isLoading ? t('auth.creating') : t('auth.createAccount') }}
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-ink-muted">
      {{ t('auth.hasAccount') }}
      <NuxtLink to="/login" class="font-medium text-primary-600 hover:text-primary-700">
        {{ t('auth.signInLink') }}
      </NuxtLink>
    </p>
  </UiCraftCard>
</template>

<script setup lang="ts">
definePageMeta({ layout: "auth", middleware: "auth" });

const { t } = useI18n();
const route = useRoute();
const { register, isLoading } = useAuth();
const { fetchUserStores, userStores } = useStore();
const { acceptInvite } = useStoreMembers();
const name = ref("");
const email = ref(String(route.query.email || ""));
const password = ref("");
const error = ref("");
const inviteToken = computed(() => String(route.query.invite || ""));

async function handleRegister() {
  error.value = "";
  try {
    await register(email.value, password.value, name.value);

    if (inviteToken.value) {
      await acceptInvite(inviteToken.value);
    }

    await fetchUserStores();
    navigateTo(userStores.value.length === 1 ? "/" : "/stores");
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || t("errors.registrationFailed");
  }
}
</script>
