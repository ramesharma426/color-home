import { describe, expect, it } from "vitest";
import { floodFill } from "./floodFill";
import type { PixelBuffer } from "./types";

function makeBuffer(width: number, height: number, fill: (x: number, y: number) => [number, number, number]): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe("floodFill", () => {
  it("selects a solid 5x5 block and nothing outside it", () => {
    // 10x10 buffer: white background, a 5x5 red block at (2,2)-(6,6)
    const buffer = makeBuffer(10, 10, (x, y) => {
      const inBlock = x >= 2 && x < 7 && y >= 2 && y < 7;
      return inBlock ? [200, 30, 30] : [255, 255, 255];
    });

    const mask = floodFill(buffer, 4, 4, 10);

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const inBlock = x >= 2 && x < 7 && y >= 2 && y < 7;
        expect(mask[y * 10 + x]).toBe(inBlock ? 1 : 0);
      }
    }
  });

  it("does not cross into a disconnected region of the same color", () => {
    // Two separate 2x2 red blocks in a 10x10 white buffer, not touching.
    const buffer = makeBuffer(10, 10, (x, y) => {
      const inFirst = x >= 1 && x < 3 && y >= 1 && y < 3;
      const inSecond = x >= 7 && x < 9 && y >= 7 && y < 9;
      return inFirst || inSecond ? [200, 30, 30] : [255, 255, 255];
    });

    const mask = floodFill(buffer, 1, 1, 10);
    const selectedCount = mask.reduce((sum, v) => sum + v, 0);

    expect(selectedCount).toBe(4); // only the first 2x2 block
    expect(mask[7 * 10 + 7]).toBe(0); // second block untouched
  });

  it("respects the tolerance threshold", () => {
    // A 3x3 block where the center pixel differs slightly from its neighbors.
    const buffer = makeBuffer(5, 5, (x, y) => {
      if (x === 2 && y === 2) return [100, 100, 100]; // seed
      if (x >= 1 && x <= 3 && y >= 1 && y <= 3) return [115, 100, 100]; // delta of 15 on R
      return [255, 255, 255];
    });

    const strict = floodFill(buffer, 2, 2, 10); // tolerance too low to include neighbors
    const loose = floodFill(buffer, 2, 2, 20); // tolerance high enough

    expect(strict.reduce((s, v) => s + v, 0)).toBe(1); // only the seed pixel
    expect(loose.reduce((s, v) => s + v, 0)).toBe(9); // the full 3x3 block
  });

  it("throws a RangeError for an out-of-bounds seed", () => {
    const buffer = makeBuffer(5, 5, () => [255, 255, 255]);
    expect(() => floodFill(buffer, 10, 10, 10)).toThrow(RangeError);
  });
});
