<template>
  <header class="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
    <div class="flex items-center gap-3">
      <button class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden" @click="toggleSidebar">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h2 class="text-lg font-semibold text-gray-800">
        {{ pageTitle }}
      </h2>
    </div>

    <div class="flex items-center gap-3">
      <span
        class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        :class="isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="isOnline ? 'bg-green-500' : 'bg-red-500'" />
        {{ isOnline ? 'Online' : 'Offline' }}
      </span>

      <div class="relative">
        <button
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          @click="showUserMenu = !showUserMenu"
        >
          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
            {{ userInitial }}
          </div>
          <span class="hidden sm:inline">{{ authUser?.name || authUser?.email }}</span>
        </button>

        <div
          v-if="showUserMenu"
          class="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button
            class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            @click="logout(); showUserMenu = false"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const route = useRoute();
const { authUser, logout } = useAuth();
const { isOnline } = useOnlineStatus();
const showUserMenu = ref(false);

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    "/": "Dashboard",
    "/pos": "POS Terminal",
    "/products": "Products",
    "/inventory": "Inventory",
    "/orders": "Orders",
    "/customers": "Customers",
    "/reports": "Reports",
    "/settings": "Settings",
    "/stores": "My Stores",
  };
  return titles[route.path] || "zKCNT POS";
});

const userInitial = computed(() => {
  const name = authUser.value?.name || authUser.value?.email || "U";
  return name.charAt(0).toUpperCase();
});

function toggleSidebar() {
  const sidebar = document.querySelector("aside");
  sidebar?.classList.toggle("-translate-x-full");
  sidebar?.classList.toggle("translate-x-0");
}

onMounted(() => {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".relative")) {
      showUserMenu.value = false;
    }
  });
});
</script>
