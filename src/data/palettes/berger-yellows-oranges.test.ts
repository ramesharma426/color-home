import { describe, expect, it } from "vitest";
import { bergerYellowsOranges } from "./berger-yellows-oranges";

describe("bergerYellowsOranges", () => {
  it("has 21 entries", () => {
    expect(bergerYellowsOranges).toHaveLength(21);
  });

  it("every entry has a valid 6-digit hex color", () => {
    for (const color of bergerYellowsOranges) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("every name and code is unique", () => {
    const names = bergerYellowsOranges.map((c) => c.name);
    const codes = bergerYellowsOranges.map((c) => c.code);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has the expected count per category", () => {
    const byCategory = (category: string) =>
      bergerYellowsOranges.filter((c) => c.category === category).length;
    expect(byCategory("facade")).toBe(12);
    expect(byCategory("trim")).toBe(6);
    expect(byCategory("roof")).toBe(3);
  });
});
