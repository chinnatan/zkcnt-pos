<template>
  <div class="craft-multi-select">
    <p class="mb-2 text-xs text-ink-muted">{{ t("common.multiSelectHint") }}</p>

    <div
      v-if="model.length > 0"
      class="mb-2 flex flex-wrap gap-1.5"
    >
      <span
        v-for="id in model"
        :key="id"
        class="craft-multi-select-chip"
      >
        {{ labelFor(id) }}
        <button
          type="button"
          class="rounded-sm px-0.5 text-primary-500 hover:bg-primary-100 hover:text-primary-700"
          :aria-label="t('common.removeItem', { name: labelFor(id) })"
          @click="toggle(id)"
        >
          ×
        </button>
      </span>
    </div>

    <input
      v-if="searchable"
      v-model="search"
      type="text"
      :placeholder="searchPlaceholder"
      class="input mb-2 text-sm"
    />

    <div
      class="craft-multi-select-list overflow-y-auto"
      :style="{ maxHeight: listMaxHeight }"
    >
      <p
        v-if="filteredOptions.length === 0"
        class="px-3 py-4 text-center text-sm text-ink-muted"
      >
        {{ search.trim() ? t("common.noSearchResults") : emptyText }}
      </p>

      <label
        v-for="option in filteredOptions"
        :key="option.id"
        class="craft-multi-select-item"
        :class="{ 'craft-multi-select-item--selected': isSelected(option.id) }"
      >
        <input
          type="checkbox"
          class="h-4 w-4 shrink-0 rounded border-border-warm text-primary-600 focus:ring-primary-200"
          :checked="isSelected(option.id)"
          @change="toggle(option.id)"
        />
        <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
        <svg
          v-if="isSelected(option.id)"
          class="h-4 w-4 shrink-0 text-primary-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </label>
    </div>

    <div class="mt-1.5 flex items-center justify-between text-xs text-ink-muted">
      <span>{{ t("common.selectedCount", { count: model.length }) }}</span>
      <button
        v-if="model.length > 0"
        type="button"
        class="font-medium text-primary-600 hover:text-primary-700 hover:underline"
        @click="clearAll"
      >
        {{ t("common.clearAll") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export type CraftMultiSelectOption = {
  id: string;
  label: string;
};

const props = withDefaults(
  defineProps<{
    options: CraftMultiSelectOption[];
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyText?: string;
    listMaxHeight?: string;
  }>(),
  {
    searchable: true,
    searchPlaceholder: "",
    emptyText: "",
    listMaxHeight: "8rem",
  },
);

const model = defineModel<string[]>({ default: () => [] });

const { t } = useI18n();
const search = ref("");

const filteredOptions = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.options;
  return props.options.filter((o) => o.label.toLowerCase().includes(q));
});

function labelFor(id: string) {
  return props.options.find((o) => o.id === id)?.label ?? id;
}

function isSelected(id: string) {
  return model.value.includes(id);
}

function toggle(id: string) {
  const next = new Set(model.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  model.value = [...next];
}

function clearAll() {
  model.value = [];
}
</script>
