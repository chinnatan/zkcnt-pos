import { describe, expect, test } from "bun:test";
import {
  buildChangesFromSubjects,
  classifyCommitType,
  parseCommitSubject,
  shouldSkipCommit,
} from "./lib/release-notes-parser.ts";
import { generateReleaseNoteEntry } from "./generate-release-notes.ts";

describe("release-notes-parser", () => {
  test("classifyCommitType maps conventional types", () => {
    expect(classifyCommitType("feat")).toBe("added");
    expect(classifyCommitType("fix")).toBe("fixed");
    expect(classifyCommitType("perf")).toBe("improved");
    expect(classifyCommitType("chore")).toBeNull();
  });

  test("shouldSkipCommit skips chore and version bumps", () => {
    expect(shouldSkipCommit("อัปเดต VERSION เป็น 0.2.0", "chore")).toBe(true);
    expect(shouldSkipCommit("เพิ่มฟีเจอร์", "feat")).toBe(false);
  });

  test("parseCommitSubject strips prefix and classifies", () => {
    expect(parseCommitSubject("feat(pos): เพิ่มหมายเหตุออเดอร์ใน POS")).toEqual({
      category: "added",
      message: "เพิ่มหมายเหตุออเดอร์ใน POS",
    });
    expect(parseCommitSubject("fix(timezone): แสดงเวลาตาม Asia/Bangkok")).toEqual({
      category: "fixed",
      message: "แสดงเวลาตาม Asia/Bangkok",
    });
    expect(parseCommitSubject("chore: อัปเดต VERSION เป็น 0.2.0")).toBeNull();
  });

  test("buildChangesFromSubjects dedupes messages", () => {
    const changes = buildChangesFromSubjects([
      "feat: เพิ่มหมายเหตุ",
      "feat: เพิ่มหมายเหตุ",
      "fix: แก้ timezone",
    ]);

    expect(changes.added.th).toEqual(["เพิ่มหมายเหตุ"]);
    expect(changes.fixed.th).toEqual(["แก้ timezone"]);
  });

  test("generateReleaseNoteEntry returns null when no user-facing commits", () => {
    expect(
      generateReleaseNoteEntry({
        version: "0.2.0",
        subjects: ["chore: อัปเดต VERSION เป็น 0.2.0"],
      }),
    ).toBeNull();
  });
});
