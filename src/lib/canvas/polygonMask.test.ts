import { describe, it, expect } from "vitest";
import { polygonToMask } from "./polygonMask";

describe("polygonToMask", () => {
  it("fills a square exactly", () => {
    const mask = polygonToMask(
      [
        { x: 2, y: 2 },
        { x: 6, y: 2 },
        { x: 6, y: 6 },
        { x: 2, y: 6 },
      ],
      10,
      10
    );
    expect(mask[4 * 10 + 4]).toBe(1); // center of the square
    expect(mask[0 * 10 + 0]).toBe(0); // outside, top-left corner
    expect(mask[9 * 10 + 9]).toBe(0); // outside, bottom-right corner
  });

  it("fills a triangle", () => {
    const mask = polygonToMask(
      [
        { x: 5, y: 1 },
        { x: 9, y: 9 },
        { x: 1, y: 9 },
      ],
      10,
      10
    );
    expect(mask[8 * 10 + 5]).toBe(1); // near the base, centered under the apex
    expect(mask[0 * 10 + 0]).toBe(0); // above the apex, outside
  });

  it("returns an empty mask for fewer than 3 points", () => {
    const mask = polygonToMask(
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
      10,
      10
    );
    expect(mask.every((v) => v === 0)).toBe(true);
  });

  it("returns a mask sized width * height", () => {
    const mask = polygonToMask(
      [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 4 },
        { x: 0, y: 4 },
      ],
      10,
      10
    );
    expect(mask.length).toBe(100);
  });
});
