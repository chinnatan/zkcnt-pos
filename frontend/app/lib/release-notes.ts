import releaseNotesData from "~/data/release-notes.json";

export type ReleaseChangeType = "added" | "fixed" | "improved";

export interface ReleaseNoteChanges {
  added: { th: string[]; en: string[] };
  fixed: { th: string[]; en: string[] };
  improved: { th: string[]; en: string[] };
}

export interface ReleaseNote {
  version: string;
  date: string;
  changes: ReleaseNoteChanges;
}

export const RELEASE_NOTES: ReleaseNote[] = releaseNotesData as ReleaseNote[];

export const RELEASE_CHANGE_TYPES: ReleaseChangeType[] = ["added", "fixed", "improved"];

export function getReleaseNote(version: string): ReleaseNote | undefined {
  return RELEASE_NOTES.find((note) => note.version === version);
}

export function localizedChangeList(
  changes: ReleaseNoteChanges[ReleaseChangeType],
  locale: string,
): string[] {
  if (locale === "en" && changes.en.length > 0) return changes.en;
  return changes.th;
}

export function releaseHasChanges(note: ReleaseNote): boolean {
  return RELEASE_CHANGE_TYPES.some((type) => note.changes[type].th.length > 0);
}
