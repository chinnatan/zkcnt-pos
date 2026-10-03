import { describe, expect, test } from "vitest";
import { formFromBooth, formToPatch, isFormDirty } from "~/lib/booths/form";
import type { Booth } from "~/lib/types";

const booth = {
  id: "b", name: "Fair", location: "BKK", start_date: "2026-10-03", end_date: "2026-10-04",
  booth_fee: 1500, extra_costs: [{ name: "travel", amount: 300 }],
} as Booth;

describe("booth form draft", () => {
  test("untouched draft is not dirty", () => {
    expect(isFormDirty(formFromBooth(booth), booth)).toBe(false);
  });

  test("editing any field makes it dirty, reverting clears it", () => {
    const f = formFromBooth(booth);
    f.name = "Fair 2";
    expect(isFormDirty(f, booth)).toBe(true);
    f.name = "Fair";
    f.extra_costs[0]!.amount = 301;
    expect(isFormDirty(f, booth)).toBe(true);
    f.extra_costs[0]!.amount = 300;
    expect(isFormDirty(f, booth)).toBe(false);
  });

  test("blank cost rows and whitespace do not count as changes", () => {
    const f = formFromBooth(booth);
    f.extra_costs.push({ name: "  ", amount: 0 });
    f.name = "Fair  ";
    expect(isFormDirty(f, booth)).toBe(false);
  });

  test("patch defaults end date to start and coerces fee", () => {
    const f = formFromBooth(booth);
    f.range = { start: "2026-11-01", end: "" };
    f.booth_fee = Number("abc");
    expect(formToPatch(f)).toMatchObject({ start_date: "2026-11-01", end_date: "2026-11-01", booth_fee: 0 });
  });
});
