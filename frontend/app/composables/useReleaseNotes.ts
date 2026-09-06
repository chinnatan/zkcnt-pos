import {
  getReleaseNote,
  localizedChangeList,
  RELEASE_NOTES,
  releaseHasChanges,
  type ReleaseNote,
} from "~/lib/release-notes";

const SEEN_KEY = "release_notes_seen_version";

export function useReleaseNotes() {
  const { locale } = useI18n();
  const { appVersion } = useAppVersion();

  const seenVersion = ref<string | null>(null);

  const currentRelease = computed(() => getReleaseNote(appVersion.value));
  const allReleases = computed(() => RELEASE_NOTES.filter(releaseHasChanges));

  const hasUnread = computed(() => {
    if (!currentRelease.value) return false;
    return seenVersion.value !== appVersion.value;
  });

  function readSeenVersion() {
    if (!import.meta.client) return;
    seenVersion.value = localStorage.getItem(SEEN_KEY);
  }

  function markAsRead() {
    if (!import.meta.client) return;
    localStorage.setItem(SEEN_KEY, appVersion.value);
    seenVersion.value = appVersion.value;
  }

  function localizedChanges(release: ReleaseNote) {
    const loc = locale.value;
    return {
      added: localizedChangeList(release.changes.added, loc),
      fixed: localizedChangeList(release.changes.fixed, loc),
      improved: localizedChangeList(release.changes.improved, loc),
    };
  }

  onMounted(readSeenVersion);

  return {
    currentRelease,
    allReleases,
    hasUnread,
    markAsRead,
    localizedChanges,
    readSeenVersion,
  };
}
