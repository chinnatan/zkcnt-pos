import { describe, expect, test } from "vitest";
import { getPeriodRange } from "~/lib/reports/aggregate";
import { getBangkokParts } from "~/lib/timezone";

function bangkokDayNumber(iso: string): number {
  const p = getBangkokParts(iso);
  return Date.UTC(p.year, p.month - 1, p.day) / 86_400_000;
}

describe("getPeriodRange('last7')", () => {
  test("เริ่ม 00:00 Bangkok เมื่อ 6 วันก่อน = ครอบคลุมวันนี้ด้วยรวม 7 วัน", () => {
    const { since, until } = getPeriodRange("last7");
    const p = getBangkokParts(since);
    expect(p.hour).toBe(0);
    expect(p.minute).toBe(0);
    expect(bangkokDayNumber(until) - bangkokDayNumber(since)).toBe(6);
  });
});
