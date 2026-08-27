import { describe, expect, it } from "vitest";
import { bergerCatalogue, bergerCategories } from "./berger-catalogue";

describe("bergerCatalogue", () => {
  it("has 1575 entries", () => {
    expect(bergerCatalogue).toHaveLength(1575);
  });

  it("every entry has a valid 6-digit hex color", () => {
    for (const color of bergerCatalogue) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("every entry's category is one of the declared categories", () => {
    for (const color of bergerCatalogue) {
      expect(bergerCategories).toContain(color.category);
    }
  });

  it("has no exact duplicate name+code pairs", () => {
    const keys = bergerCatalogue.map((c) => `${c.name}|${c.code}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every entry has a non-empty name and code", () => {
    for (const color of bergerCatalogue) {
      expect(color.name.length).toBeGreaterThan(0);
      expect(color.code.length).toBeGreaterThan(0);
    }
  });
});
