import { describe, expect, it } from "vitest";
import { asianPaintsCatalogue, asianPaintsCategories } from "./asian-paints-catalogue";

describe("asianPaintsCatalogue", () => {
  it("has 1828 entries", () => {
    expect(asianPaintsCatalogue).toHaveLength(1828);
  });

  it("every entry has a valid 6-digit hex color", () => {
    for (const color of asianPaintsCatalogue) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("every entry's category is one of the declared categories", () => {
    for (const color of asianPaintsCatalogue) {
      expect(asianPaintsCategories).toContain(color.category);
    }
  });

  it("has no exact duplicate name+code pairs", () => {
    const keys = asianPaintsCatalogue.map((c) => `${c.name}|${c.code}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every entry has a non-empty name and code", () => {
    for (const color of asianPaintsCatalogue) {
      expect(color.name.length).toBeGreaterThan(0);
      expect(color.code.length).toBeGreaterThan(0);
    }
  });
});
