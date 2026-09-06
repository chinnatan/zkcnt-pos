<template>
  <div class="space-y-4">
    <div v-if="showHeader" class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm font-semibold text-ink">
          {{ t("releaseNotes.whatsNew") }}
          <span class="text-primary-600">v{{ release.version }}</span>
        </p>
        <p class="mt-0.5 text-xs text-ink-muted">{{ formatDate(release.date) }}</p>
      </div>
      <slot name="actions" />
    </div>

    <div class="space-y-3">
      <section
        v-for="type in visibleTypes"
        :key="type"
      >
        <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide" :class="badgeClass(type)">
          {{ t(`releaseNotes.${type}`) }}
        </p>
        <ul class="space-y-1 text-sm text-ink">
          <li
            v-for="(item, index) in changes[type]"
            :key="`${type}-${index}`"
            class="flex gap-2"
          >
            <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
            <span>{{ item }}</span>
          </li>
        </ul>
      </section>
    </div>

    <div v-if="showDismiss || showViewAll" class="flex flex-wrap items-center gap-3 pt-1">
      <NuxtLink
        v-if="showViewAll"
        to="/release-notes"
        class="text-sm font-medium text-primary-600 hover:underline"
      >
        {{ t("releaseNotes.viewAll") }}
      </NuxtLink>
      <button
        v-if="showDismiss"
        type="button"
        class="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        @click="emit('dismiss')"
      >
        {{ t("releaseNotes.dismiss") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  RELEASE_CHANGE_TYPES,
  type ReleaseChangeType,
  type ReleaseNote,
} from "~/lib/release-notes";

const props = withDefaults(
  defineProps<{
    release: ReleaseNote;
    changes: Record<ReleaseChangeType, string[]>;
    showHeader?: boolean;
    showDismiss?: boolean;
    showViewAll?: boolean;
  }>(),
  {
    showHeader: true,
    showDismiss: false,
    showViewAll: false,
  },
);

const emit = defineEmits<{
  dismiss: [];
}>();

const { t, locale } = useI18n();

const visibleTypes = computed(() =>
  RELEASE_CHANGE_TYPES.filter((type) => props.changes[type].length > 0),
);

function badgeClass(type: ReleaseChangeType): string {
  if (type === "added") return "text-success-700";
  if (type === "fixed") return "text-danger-700";
  return "text-primary-700";
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale.value === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
</script>
