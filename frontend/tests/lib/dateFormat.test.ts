import { describe, expect, test } from "vitest";
import { formatBangkokDate, formatBangkokDateTime, formatDateKey } from "~/lib/timezone";

describe("app date format dd/MM/yyyy (th = พ.ศ., others = ค.ศ.)", () => {
  test("non-Thai locales: Bangkok time, zero-padded, Gregorian year", () => {
    expect(formatBangkokDate("2026-10-03T08:05:09Z")).toBe("03/10/2026");
    // 18:00Z is already the next day in Bangkok
    expect(formatBangkokDate("2026-10-03T18:00:00Z")).toBe("04/10/2026");
    expect(formatBangkokDateTime("2026-10-03T08:05:09Z")).toBe("03/10/2026 15:05:09");
    expect(formatBangkokDateTime("2026-10-03T17:30:00Z")).toBe("04/10/2026 00:30:00");
  });

  test("Thai locale uses Buddhist-era year", () => {
    expect(formatBangkokDate("2026-10-03T08:05:09Z", "th")).toBe("03/10/2569");
    expect(formatBangkokDate("2026-10-03T18:00:00Z", "th")).toBe("04/10/2569");
    expect(formatBangkokDateTime("2026-10-03T08:05:09Z", "th")).toBe("03/10/2569 15:05:09");
    expect(formatDateKey("2026-10-03", "th")).toBe("03/10/2569");
    expect(formatDateKey("2026-10-03", "en")).toBe("03/10/2026");
  });

  test("date key keeps the calendar day (no timezone shift)", () => {
    expect(formatDateKey("2026-10-03")).toBe("03/10/2026");
    expect(formatDateKey("")).toBe("");
    expect(formatDateKey(undefined)).toBe("");
  });
});
