import { describe, expect, test } from "vitest";
import {
  addDays,
  boothEvents,
  boothStatus,
  buildMonthGrid,
  nextRange,
  selectionToRange,
  weekdayOrder,
} from "~/lib/booths/calendar";

const b = (extra = {}) => ({
  id: "x", name: "Fair", closed_at: "", start_date: "2026-10-03", end_date: "2026-10-04", deleted_at: null, ...extra,
});

describe("booth calendar helpers", () => {
  test("addDays crosses month/year/leap boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("status follows closed / dates", () => {
    expect(boothStatus(b(), "2026-10-02")).toBe("upcoming");
    expect(boothStatus(b(), "2026-10-03")).toBe("ongoing");
    expect(boothStatus(b(), "2026-10-04")).toBe("ongoing");
    expect(boothStatus(b(), "2026-10-05")).toBe("ended");
    expect(boothStatus(b({ closed_at: "x" }), "2026-10-03")).toBe("closed");
    expect(boothStatus(b({ start_date: "", end_date: "" }), "2026-10-03")).toBe("ongoing");
  });

  test("events: exclusive end, single day fallback, skips undated/deleted", () => {
    const ev = boothEvents(
      [b(), b({ id: "y", end_date: "" }), b({ id: "z", start_date: "" }), b({ id: "d", deleted_at: "t" }), b({ id: "m", start_date: "2026-10-30", end_date: "2026-11-02" })],
      "2026-10-03",
    );
    expect(ev.map((e) => e.id)).toEqual(["x", "y", "m"]);
    expect(ev[0]).toMatchObject({ start: "2026-10-03", end: "2026-10-05" });
    expect(ev[1]).toMatchObject({ start: "2026-10-03", end: "2026-10-04" });
    expect(ev[2]).toMatchObject({ start: "2026-10-30", end: "2026-11-03" });
  });

  test("select range converts exclusive end", () => {
    expect(selectionToRange("2026-10-03", "2026-10-05")).toEqual({ start: "2026-10-03", end: "2026-10-04" });
    expect(selectionToRange("2026-10-03", "2026-10-04")).toEqual({ start: "2026-10-03", end: "2026-10-03" });
  });

  test("picker click flow", () => {
    let r = nextRange({ start: "", end: "" }, "2026-10-10");
    expect(r).toEqual({ start: "2026-10-10", end: "" });
    r = nextRange(r, "2026-10-12");
    expect(r).toEqual({ start: "2026-10-10", end: "2026-10-12" });
    r = nextRange(r, "2026-10-20");
    expect(r).toEqual({ start: "2026-10-20", end: "" });
    expect(nextRange({ start: "2026-10-10", end: "" }, "2026-10-05")).toEqual({ start: "2026-10-05", end: "" });
    expect(nextRange({ start: "2026-10-10", end: "" }, "2026-10-10")).toEqual({ start: "2026-10-10", end: "2026-10-10" });
  });

  test("month grid honours week start", () => {
    // 1 Oct 2026 is a Thursday
    const sun = buildMonthGrid(2026, 10, 0);
    expect(sun).toHaveLength(6);
    expect(sun[0]![0]).toEqual({ key: "2026-09-27", inMonth: false });
    expect(sun[0]![4]).toEqual({ key: "2026-10-01", inMonth: true });
    const mon = buildMonthGrid(2026, 10, 1);
    expect(mon[0]![0]!.key).toBe("2026-09-28");
    expect(mon[0]![3]!.key).toBe("2026-10-01");
    // a month starting on the week start has no leading days
    expect(buildMonthGrid(2026, 2, 0)[0]![0]).toEqual({ key: "2026-02-01", inMonth: true });
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});
