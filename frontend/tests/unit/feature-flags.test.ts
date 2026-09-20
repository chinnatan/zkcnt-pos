import { describe, expect, test } from "vitest";
import { isStoreFeatureEnabled } from "~/lib/feature-flags";

describe("store feature flags", () => {
  test("uses registry defaults when a store has no override", () => {
    expect(isStoreFeatureEnabled({}, "promotions_enabled")).toBe(true);
    expect(isStoreFeatureEnabled({}, "customers_enabled")).toBe(false);
  });

  test("store overrides take precedence over registry defaults", () => {
    expect(
      isStoreFeatureEnabled(
        { feature_flags: { customers_enabled: true } },
        "customers_enabled",
      ),
    ).toBe(true);
  });
});
