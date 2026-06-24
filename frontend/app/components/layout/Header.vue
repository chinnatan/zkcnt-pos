<template>
  <header class="flex h-14 shrink-0 items-center justify-between border-b border-border-warm bg-paper px-4 lg:px-6">
    <div class="flex items-center gap-3">
      <button class="rounded p-1.5 text-ink-muted hover:bg-surface hover:text-ink lg:hidden" @click="toggle">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h2 class="font-display text-lg font-semibold text-ink">
        {{ pageTitle }}
      </h2>
    </div>

    <div class="flex items-center gap-3">
      <LayoutLocaleSwitcher />

      <span
        class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        :class="isOnline ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="isOnline ? 'bg-success-500' : 'bg-danger-500'" />
        {{ isOnline ? t('common.online') : t('common.offline') }}
      </span>

      <div class="relative">
        <button
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface"
          @click="showUserMenu = !showUserMenu"
        >
          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
            {{ userInitial }}
          </div>
          <span class="hidden sm:inline">{{ authUser?.name || authUser?.email }}</span>
        </button>

        <div
          v-if="showUserMenu"
          class="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border-warm bg-paper py-1 shadow-lg"
        >
          <button
            class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-surface"
            @click="logout(); showUserMenu = false"
          >
            {{ t('nav.logout') }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();
const { authUser, logout } = useAuth();
const { isOnline } = useOnlineStatus();
const { toggle } = useSidebar();
const showUserMenu = ref(false);

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    "/": t("nav.dashboard"),
    "/pos": t("nav.pos"),
    "/products": t("nav.products"),
    "/inventory": t("nav.inventory"),
    "/orders": t("nav.orders"),
    "/customers": t("nav.customers"),
    "/reports": t("nav.reports"),
    "/settings": t("nav.settings"),
    "/stores": t("nav.stores"),
    "/discounts": t("nav.promotions"),
    "/promotions": t("nav.promotions"),
  };
  return titles[route.path] || t("nav.appName");
});

const userInitial = computed(() => {
  const name = authUser.value?.name || authUser.value?.email || "U";
  return name.charAt(0).toUpperCase();
});

onMounted(() => {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".relative")) {
      showUserMenu.value = false;
    }
  });
});
</script>
