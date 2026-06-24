<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-ink">{{ t('customersPage.title') }}</h2>
      <button
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        @click="openModal()"
      >
        {{ t('customersPage.addCustomer') }}
      </button>
    </div>

    <div class="relative">
      <input
        v-model="search"
        type="text"
        :placeholder="t('customersPage.searchPlaceholder')"
        class="w-full rounded-lg border border-border-warm px-4 py-2.5 pl-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
      <svg class="absolute left-3 top-3 h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <div class="rounded-xl bg-paper shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>

      <div v-else-if="filteredCustomers.length === 0" class="py-12 text-center text-ink-muted">
        {{ t('customersPage.noCustomers') }}
      </div>

      <div v-else>
        <UiMobileDataList>
          <template #table>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-border-warm bg-surface text-xs uppercase text-ink-muted">
                  <tr>
                    <th class="px-4 py-3">{{ t('common.name') }}</th>
                    <th class="px-4 py-3">{{ t('common.phone') }}</th>
                    <th class="px-4 py-3">{{ t('common.email') }}</th>
                    <th class="px-4 py-3 text-right">{{ t('customersPage.totalSpent') }}</th>
                    <th class="px-4 py-3 text-right">{{ t('common.visits') }}</th>
                    <th class="px-4 py-3">{{ t('common.actions') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-warm">
                  <tr v-for="customer in filteredCustomers" :key="customer.id" class="hover:bg-surface">
                    <td class="px-4 py-3 font-medium text-ink">{{ customer.name }}</td>
                    <td class="px-4 py-3 text-ink-muted">{{ customer.phone || '-' }}</td>
                    <td class="px-4 py-3 text-ink-muted">{{ customer.email || '-' }}</td>
                    <td class="px-4 py-3 text-right">{{ formatCurrency(customer.total_spent) }}</td>
                    <td class="px-4 py-3 text-right">{{ customer.visit_count }}</td>
                    <td class="px-4 py-3">
                      <div class="flex gap-1">
                        <button class="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50" @click="openModal(customer)">
                          {{ t('common.edit') }}
                        </button>
                        <button class="rounded px-2 py-1 text-xs text-danger-500 hover:bg-danger-50" @click="handleDelete(customer.id)">
                          {{ t('common.delete') }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <template #cards>
            <UiMobileDataCard
              v-for="customer in filteredCustomers"
              :key="customer.id"
              :title="customer.name"
              :subtitle="customer.phone || customer.email || '-'"
            >
              <template #fields>
                <div>
                  <span class="text-ink-muted">{{ t('customersPage.totalSpent') }}</span>
                  <p class="font-medium text-ink">{{ formatCurrency(customer.total_spent) }}</p>
                </div>
                <div>
                  <span class="text-ink-muted">{{ t('common.visits') }}</span>
                  <p class="text-ink-muted">{{ customer.visit_count }}</p>
                </div>
              </template>
              <template #actions>
                <button
                  class="rounded-lg px-3 py-2 text-xs font-medium text-primary-600 hover:bg-primary-50"
                  @click="openModal(customer)"
                >
                  {{ t('common.edit') }}
                </button>
                <button
                  class="rounded-lg px-3 py-2 text-xs font-medium text-danger-500 hover:bg-danger-50"
                  @click="handleDelete(customer.id)"
                >
                  {{ t('common.delete') }}
                </button>
              </template>
            </UiMobileDataCard>
          </template>
        </UiMobileDataList>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="craft-modal-backdrop craft-modal-backdrop--center z-50" @click.self="showModal = false">
        <div class="craft-modal-panel craft-modal--stitched max-w-md">
          <h3 class="mb-4 text-lg font-semibold">{{ editingId ? t('customersPage.editCustomer') : t('customersPage.addCustomerModal') }}</h3>

          <form @submit.prevent="handleSave" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.nameRequired') }}</label>
              <input v-model="form.name" type="text" required class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.phone') }}</label>
              <input v-model="form.phone" type="tel" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.email') }}</label>
              <input v-model="form.email" type="email" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.address') }}</label>
              <textarea v-model="form.address" rows="2" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-ink">{{ t('common.note') }}</label>
              <input v-model="form.note" type="text" class="w-full rounded-lg border border-border-warm px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 rounded-lg border border-border-warm px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface" @click="showModal = false">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
                {{ t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Customer } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { formatCurrency } = useFormat();
const { customers, isLoading, fetchCustomers, createCustomer, updateCustomer, deleteCustomer } = useCustomers();
const { confirm } = useDialog();

const search = ref("");
const showModal = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ name: "", phone: "", email: "", address: "", note: "" });

const filteredCustomers = computed(() => {
  if (!search.value) return customers.value;
  const q = search.value.toLowerCase();
  return customers.value.filter(
    (c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q),
  );
});

function openModal(customer?: Customer) {
  if (customer) {
    editingId.value = customer.id;
    Object.assign(form, { name: customer.name, phone: customer.phone, email: customer.email, address: customer.address, note: customer.note });
  } else {
    editingId.value = null;
    Object.assign(form, { name: "", phone: "", email: "", address: "", note: "" });
  }
  showModal.value = true;
}

async function handleSave() {
  if (editingId.value) {
    await updateCustomer(editingId.value, { ...form });
  } else {
    await createCustomer({ ...form });
  }
  showModal.value = false;
}

async function handleDelete(id: string) {
  if (await confirm(t("common.confirmDeleteCustomer"))) {
    await deleteCustomer(id);
  }
}

onMounted(() => {
  fetchCustomers();
});
</script>
