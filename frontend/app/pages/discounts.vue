<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">Discounts & Promotions</h2>
      <button
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        @click="openModal()"
      >
        Add Discount
      </button>
    </div>

    <div class="rounded-xl bg-white shadow-sm">
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>

      <div v-else-if="discounts.length === 0" class="py-12 text-center text-gray-400">
        No discounts created yet
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-4 py-3">Name</th>
              <th class="px-4 py-3">Type</th>
              <th class="px-4 py-3">Value</th>
              <th class="px-4 py-3">Min Purchase</th>
              <th class="px-4 py-3">Period</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="discount in discounts" :key="discount.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{{ discount.name }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {{ discount.type }}
                </span>
              </td>
              <td class="px-4 py-3">
                {{ discount.type === 'percent' ? `${discount.value}%` : formatCurrency(discount.value) }}
              </td>
              <td class="px-4 py-3">{{ formatCurrency(discount.min_purchase) }}</td>
              <td class="px-4 py-3 text-xs text-gray-500">
                <template v-if="discount.start_date || discount.end_date">
                  {{ discount.start_date ? formatDate(discount.start_date) : 'N/A' }} -
                  {{ discount.end_date ? formatDate(discount.end_date) : 'N/A' }}
                </template>
                <template v-else>Always</template>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="discount.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                >
                  {{ discount.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1">
                  <button class="rounded px-2 py-1 text-xs text-primary-600 hover:bg-primary-50" @click="openModal(discount)">Edit</button>
                  <button class="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click="handleDelete(discount.id)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Discount Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showModal = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h3 class="mb-4 text-lg font-semibold">{{ editingId ? 'Edit' : 'Add' }} Discount</h3>
          <form @submit.prevent="handleSave" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Name *</label>
              <input v-model="form.name" type="text" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">Type</label>
                <select v-model="form.type" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none">
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed Amount (฿)</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">Value *</label>
                <input v-model.number="form.value" type="number" min="0" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Min Purchase (฿)</label>
              <input v-model.number="form.min_purchase" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                <input v-model="form.start_date" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                <input v-model="form.end_date" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input v-model="form.is_active" type="checkbox" id="is_active" class="h-4 w-4 rounded border-gray-300 text-primary-600" />
              <label for="is_active" class="text-sm font-medium text-gray-700">Active</label>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showModal = false">Cancel</button>
              <button type="submit" class="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">Save</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Discount } from "~/lib/types";

definePageMeta({ middleware: "auth" });

const { discounts, isLoading, fetchDiscounts, createDiscount, updateDiscount, deleteDiscount } = useDiscounts();

const showModal = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  name: "",
  type: "percent" as "percent" | "fixed",
  value: 0,
  min_purchase: 0,
  start_date: "",
  end_date: "",
  is_active: true,
});

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH");
}

function openModal(discount?: Discount) {
  if (discount) {
    editingId.value = discount.id;
    Object.assign(form, {
      name: discount.name,
      type: discount.type,
      value: discount.value,
      min_purchase: discount.min_purchase,
      start_date: discount.start_date?.slice(0, 10) || "",
      end_date: discount.end_date?.slice(0, 10) || "",
      is_active: discount.is_active,
    });
  } else {
    editingId.value = null;
    Object.assign(form, { name: "", type: "percent", value: 0, min_purchase: 0, start_date: "", end_date: "", is_active: true });
  }
  showModal.value = true;
}

async function handleSave() {
  if (editingId.value) {
    await updateDiscount(editingId.value, { ...form });
  } else {
    await createDiscount({ ...form });
  }
  showModal.value = false;
}

async function handleDelete(id: string) {
  if (confirm("Are you sure?")) {
    await deleteDiscount(id);
  }
}

onMounted(() => {
  fetchDiscounts();
});
</script>
