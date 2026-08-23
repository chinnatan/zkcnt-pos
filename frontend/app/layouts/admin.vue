<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-surface lg:flex-row">
    <!-- Mobile top bar -->
    <header
      class="flex h-14 shrink-0 items-center justify-between border-b border-border-warm bg-paper px-4 lg:hidden"
    >
      <button
        type="button"
        class="rounded-lg p-2 text-ink-muted hover:bg-surface hover:text-ink"
        :aria-label="t('admin.nav.title')"
        @click="sidebarOpen = true"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 class="truncate font-display text-base font-semibold text-ink">
        {{ pageTitle }}
      </h1>
      <LayoutLocaleSwitcher />
    </header>

    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      @click="sidebarOpen = false"
    />

    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-warm bg-paper transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <div class="flex h-14 items-center justify-between border-b border-border-warm px-4">
        <NuxtLink
          to="/admin"
          class="font-display text-lg font-bold text-primary-700"
          @click="sidebarOpen = false"
        >
          {{ t('admin.nav.title') }}
        </NuxtLink>
        <button
          type="button"
          class="rounded p-1 text-ink-muted hover:text-ink lg:hidden"
          @click="sidebarOpen = false"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto p-3">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="isActive(item.to) ? 'bg-primary-100/80 text-primary-700' : 'text-ink-muted hover:bg-primary-50/60 hover:text-ink'"
          @click="sidebarOpen = false"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="border-t border-border-warm p-3">
        <NuxtLink
          to="/"
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-surface hover:text-ink"
          @click="sidebarOpen = false"
        >
          ← {{ t('admin.nav.backToApp') }}
        </NuxtLink>
      </div>
    </aside>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header
        class="sticky top-0 z-30 hidden h-14 shrink-0 items-center justify-between border-b border-border-warm bg-paper/95 px-6 backdrop-blur lg:flex"
      >
        <h2 class="font-display text-lg font-semibold text-ink">{{ pageTitle }}</h2>
        <div class="flex items-center gap-3">
          <LayoutLocaleSwitcher />
          <div class="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-ink">
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
              {{ userInitial }}
            </div>
            <span class="max-w-[12rem] truncate text-ink-muted">{{ authUser?.email }}</span>
          </div>
        </div>
      </header>

      <main class="relative z-0 flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6">
        <div class="mx-auto max-w-7xl space-y-6">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();
const { authUser } = useAuth();

const sidebarOpen = ref(false);

watch(() => route.path, () => {
  sidebarOpen.value = false;
});

const menuItems = computed(() => [
  { to: "/admin", label: t("admin.nav.overview") },
  { to: "/admin/stores", label: t("admin.nav.stores") },
  { to: "/admin/users", label: t("admin.nav.users") },
  { to: "/admin/activity", label: t("admin.nav.activity") },
  { to: "/admin/devices", label: t("admin.nav.devices") },
  { to: "/admin/system", label: t("admin.nav.system") },
]);

function isActive(path: string) {
  if (path === "/admin") return route.path === "/admin";
  return route.path === path || route.path.startsWith(`${path}/`);
}

const pageTitle = computed(() => {
  const map: Record<string, string> = {
    "/admin": t("admin.nav.overview"),
    "/admin/stores": t("admin.nav.stores"),
    "/admin/users": t("admin.nav.users"),
    "/admin/activity": t("admin.nav.activity"),
    "/admin/devices": t("admin.nav.devices"),
    "/admin/system": t("admin.nav.system"),
  };
  if (route.path.startsWith("/admin/stores/")) return t("admin.storeDetail.title");
  if (route.path.startsWith("/admin/users/")) return t("admin.userDetail.title");
  return map[route.path] || t("admin.nav.title");
});

const userInitial = computed(() => {
  const name = authUser.value?.name || authUser.value?.email || "A";
  return name.charAt(0).toUpperCase();
});
</script>
