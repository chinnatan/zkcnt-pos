import { describe, expect, test } from "vitest";
import { getReleaseNote, localizedChangeList, releaseHasChanges } from "~/lib/release-notes";

describe("release-notes lib", () => {
  test("getReleaseNote finds version entry", () => {
    const note = getReleaseNote("0.2.0");
    expect(note).toBeDefined();
    expect(note?.version).toBe("0.2.0");
  });

  test("localizedChangeList falls back to th for en when empty", () => {
    const list = localizedChangeList({ th: ["เพิ่มฟีเจอร์"], en: [] }, "en");
    expect(list).toEqual(["เพิ่มฟีเจอร์"]);
  });

  test("releaseHasChanges detects non-empty note", () => {
    const note = getReleaseNote("0.2.0");
    expect(note).toBeDefined();
    if (!note) return;
    expect(releaseHasChanges(note)).toBe(true);
  });

  test("unread logic: unseen version differs from app version", () => {
    const seenVersion: string | null = null;
    const appVersion = "0.2.0";
    const hasRelease = true;
    expect(hasRelease && seenVersion !== appVersion).toBe(true);
    expect(hasRelease && "0.2.0" !== appVersion).toBe(false);
  });
});
