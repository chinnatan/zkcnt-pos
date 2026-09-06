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

const SKIP_TYPES = new Set(["chore", "ci", "build", "docs", "test", "style"]);
const VERSION_BUMP_PATTERN = /อัปเดต\s+VERSION/i;

const CONVENTIONAL_RE = /^(feat|fix|perf|refactor|style|docs|chore|ci|build|test)(?:\([^)]+\))?!?:\s*(.+)$/i;

export function classifyCommitType(type: string): ReleaseChangeType | null {
  const normalized = type.toLowerCase();
  if (normalized === "feat") return "added";
  if (normalized === "fix") return "fixed";
  if (normalized === "perf" || normalized === "refactor" || normalized === "style") return "improved";
  return null;
}

export function shouldSkipCommit(subject: string, type?: string): boolean {
  if (type && SKIP_TYPES.has(type.toLowerCase())) return true;
  if (VERSION_BUMP_PATTERN.test(subject)) return true;
  return false;
}

export function cleanCommitMessage(subject: string): string | null {
  const trimmed = subject.trim();
  if (!trimmed) return null;

  const match = trimmed.match(CONVENTIONAL_RE);
  if (!match) return trimmed;

  const [, type, message] = match;
  if (!type || !message) return trimmed;
  if (shouldSkipCommit(message, type)) return null;

  const category = classifyCommitType(type);
  if (!category) return null;

  return message.trim();
}

export function parseCommitSubject(subject: string): { category: ReleaseChangeType; message: string } | null {
  const trimmed = subject.trim();
  const match = trimmed.match(CONVENTIONAL_RE);
  if (!match) return null;

  const [, type, message] = match;
  if (!type || !message) return null;
  if (shouldSkipCommit(message, type)) return null;

  const category = classifyCommitType(type);
  if (!category) return null;

  const cleaned = message.trim();
  if (!cleaned) return null;

  return { category, message: cleaned };
}

export function emptyChanges(): ReleaseNoteChanges {
  return {
    added: { th: [], en: [] },
    fixed: { th: [], en: [] },
    improved: { th: [], en: [] },
  };
}

export function addChange(changes: ReleaseNoteChanges, category: ReleaseChangeType, message: string): void {
  const bucket = changes[category].th;
  if (!bucket.includes(message)) {
    bucket.push(message);
    changes[category].en.push(message);
  }
}

export function buildChangesFromSubjects(subjects: string[]): ReleaseNoteChanges {
  const changes = emptyChanges();

  for (const subject of subjects) {
    const parsed = parseCommitSubject(subject);
    if (!parsed) continue;
    addChange(changes, parsed.category, parsed.message);
  }

  return changes;
}

export function hasAnyChanges(changes: ReleaseNoteChanges): boolean {
  return (
    changes.added.th.length > 0 ||
    changes.fixed.th.length > 0 ||
    changes.improved.th.length > 0
  );
}
