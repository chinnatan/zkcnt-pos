import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readVersionFromRoot } from "./read-version.ts";
import {
  buildChangesFromSubjects,
  hasAnyChanges,
  type ReleaseNote,
} from "./lib/release-notes-parser.ts";

const ROOT = join(import.meta.dirname, "..");
const OUTPUT_PATH = join(ROOT, "frontend/app/data/release-notes.json");

function runGit(args: string): string {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8" }).trim();
}

function readExistingNotes(): ReleaseNote[] {
  if (!existsSync(OUTPUT_PATH)) return [];
  try {
    const raw = readFileSync(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(raw) as ReleaseNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function listVersionTags(): string[] {
  try {
    const output = runGit('tag --sort=-v:refname');
    if (!output) return [];
    return output
      .split("\n")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => tag.replace(/^v/i, ""));
  } catch {
    return [];
  }
}

function findPreviousVersion(currentVersion: string, existing: ReleaseNote[]): string | null {
  const tags = listVersionTags().filter((v) => v !== currentVersion);
  if (tags.length > 0) return tags[0] ?? null;

  const fromFile = existing
    .map((note) => note.version)
    .filter((v) => v !== currentVersion);
  return fromFile[0] ?? null;
}

function resolveGitRange(previousVersion: string | null): string {
  if (previousVersion) {
    const tagRef = `v${previousVersion}`;
    try {
      runGit(`rev-parse ${tagRef}`);
      return `${tagRef}..HEAD`;
    } catch {
      // fall through
    }
  }
  return "HEAD";
}

function getCommitSubjects(range: string): string[] {
  try {
    const output = runGit(`log ${range} --no-merges --pretty=format:%s`);
    if (!output) return [];
    return output.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function getReleaseDate(): string {
  try {
    const output = runGit("log -1 --pretty=format:%cs");
    if (output) return output;
  } catch {
    // ignore
  }
  return new Date().toISOString().slice(0, 10);
}

function writeNotes(notes: ReleaseNote[]): void {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(notes, null, 2)}\n`, "utf8");
}

export function generateReleaseNoteEntry(options: {
  version: string;
  subjects: string[];
  date?: string;
}): ReleaseNote | null {
  const changes = buildChangesFromSubjects(options.subjects);
  if (!hasAnyChanges(changes)) return null;

  return {
    version: options.version,
    date: options.date ?? new Date().toISOString().slice(0, 10),
    changes,
  };
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  const version = readVersionFromRoot(ROOT);
  const existing = readExistingNotes();

  if (existing.some((note) => note.version === version) && !force) {
    console.log(`Release note for v${version} already exists. Use --force to regenerate.`);
    process.exit(0);
  }

  const previousVersion = findPreviousVersion(version, existing);
  const range = resolveGitRange(previousVersion);
  const subjects = getCommitSubjects(range);
  const entry = generateReleaseNoteEntry({
    version,
    subjects,
    date: getReleaseDate(),
  });

  if (!entry) {
    console.log(`No user-facing commits found in range ${range}.`);
    process.exit(1);
  }

  const withoutCurrent = existing.filter((note) => note.version !== version);
  const next = [entry, ...withoutCurrent];

  if (dryRun) {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  writeNotes(next);
  console.log(`Wrote release notes for v${version} to ${OUTPUT_PATH}`);
  console.log(`  Range: ${range}`);
  console.log(`  Added: ${entry.changes.added.th.length}, Fixed: ${entry.changes.fixed.th.length}, Improved: ${entry.changes.improved.th.length}`);
}

if (import.meta.main) {
  main();
}
