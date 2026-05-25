<template>
  <div>
    <NuxtLayout name="auth">
      <div class="rounded-xl bg-white p-6 shadow-sm">
        <h2 class="mb-2 text-center text-xl font-semibold text-gray-800">Select Store</h2>
        <p class="mb-6 text-center text-sm text-gray-500">Choose a store to work with</p>

        <div v-if="isLoadingStores" class="flex justify-center py-8">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>

        <div v-else-if="userStores.length === 0" class="py-6 text-center">
          <p class="mb-4 text-gray-500">You don't have any stores yet.</p>
          <button
            class="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            @click="showCreateModal = true"
          >
            Create Your First Store
          </button>
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="store in userStores"
            :key="store.id"
            class="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition-all hover:border-primary-300 hover:bg-primary-50"
            :class="activeStore?.id === store.id ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20' : ''"
            @click="selectStore(store)"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700">
              {{ store.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-gray-800">{{ store.name }}</div>
              <div class="truncate text-sm text-gray-500">{{ store.address || 'No address' }}</div>
            </div>
            <svg v-if="activeStore?.id === store.id" class="h-5 w-5 shrink-0 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>

          <button
            class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm font-medium text-gray-500 hover:border-primary-300 hover:text-primary-600"
            @click="showCreateModal = true"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create New Store
          </button>
        </div>
      </div>
    </NuxtLayout>

    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-semibold text-gray-800">Create New Store</h3>

          <div v-if="createError" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {{ createError }}
          </div>

          <form @submit.prevent="handleCreateStore" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Store Name</label>
              <input
                v-model="newStore.name"
                type="text"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="My Shop"
                @input="generateSlug"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Slug (URL identifier)</label>
              <input
                v-model="newStore.slug"
                type="text"
                required
                pattern="^[a-z0-9-]+$"
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="my-shop"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Address</label>
              <input
                v-model="newStore.address"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input
                v-model="newStore.phone"
                type="tel"
                class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="0812345678"
              />
            </div>
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="showCreateModal = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isCreating"
                class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {{ isCreating ? 'Creating...' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Store } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { activeStore, userStores, isLoadingStores, fetchUserStores, setActiveStore, createStore } = useStore();

const showCreateModal = ref(false);
const isCreating = ref(false);
const createError = ref("");
const newStore = reactive({ name: "", slug: "", address: "", phone: "" });

onMounted(() => {
  fetchUserStores();
});

async function selectStore(store: Store) {
  await setActiveStore(store);
  navigateTo("/");
}

function generateSlug() {
  newStore.slug = newStore.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function handleCreateStore() {
  createError.value = "";
  isCreating.value = true;
  try {
    const store = await createStore(newStore);
    showCreateModal.value = false;
    await setActiveStore(store as unknown as Store);
    navigateTo("/");
  } catch (e: any) {
    createError.value = e?.message || "Failed to create store";
  } finally {
    isCreating.value = false;
  }
}
</script>
