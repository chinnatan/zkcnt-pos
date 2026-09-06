import { describe, expect, test } from "vitest";
import { fitImageDimensions } from "~/lib/files/optimize-image";

describe("fitImageDimensions", () => {
  test("keeps size when within bounds", () => {
    expect(fitImageDimensions(800, 600, 1920, 1920)).toEqual({ width: 800, height: 600 });
  });

  test("scales down preserving aspect ratio", () => {
    expect(fitImageDimensions(4000, 2000, 1920, 1920)).toEqual({
      width: 1920,
      height: 960,
    });
  });

  test("respects both max width and height", () => {
    expect(fitImageDimensions(3000, 3000, 1920, 1080)).toEqual({
      width: 1080,
      height: 1080,
    });
  });
});
