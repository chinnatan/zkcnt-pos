<template>
  <div class="space-y-6">
    <div>
      <NuxtLink to="/" class="text-sm text-primary-600 hover:underline">
        ← {{ t("nav.dashboard") }}
      </NuxtLink>
      <h2 class="mt-1 text-lg font-semibold text-ink">{{ t("releaseNotes.historyTitle") }}</h2>
      <p class="mt-1 text-sm text-ink-muted">{{ displayVersion }}</p>
    </div>

    <div v-if="allReleases.length === 0" class="rounded-xl bg-paper p-8 text-center text-ink-muted">
      {{ t("releaseNotes.noNotes") }}
    </div>

    <div v-else class="space-y-3">
      <UiCraftCard
        v-for="release in allReleases"
        :key="release.version"
        variant="paper"
        padding="md"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 text-left"
          @click="toggle(release.version)"
        >
          <div>
            <p class="font-semibold text-ink">v{{ release.version }}</p>
            <p class="text-xs text-ink-muted">{{ formatDate(release.date) }}</p>
          </div>
          <svg
            class="h-5 w-5 shrink-0 text-ink-muted transition-transform"
            :class="expanded[release.version] ? 'rotate-180' : ''"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="expanded[release.version]" class="mt-4 border-t border-border-warm pt-4">
          <ReleaseNotesPanel
            :release="release"
            :changes="localizedChanges(release)"
            :show-header="false"
          />
        </div>
      </UiCraftCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { t, locale } = useI18n();
const { displayVersion } = useAppVersion();
const { allReleases, localizedChanges, currentRelease, markAsRead } = useReleaseNotes();

const expanded = reactive<Record<string, boolean>>({});

function toggle(version: string) {
  expanded[version] = !expanded[version];
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale.value === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

onMounted(() => {
  if (currentRelease.value) {
    expanded[currentRelease.value.version] = true;
    markAsRead();
  }
});
</script>
