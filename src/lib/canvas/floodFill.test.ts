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
    const buffer = makeBuffer(10, 10, (x, y) => {
      const inFirst = x >= 1 && x < 3 && y >= 1 && y < 3;
      const inSecond = x >= 7 && x < 9 && y >= 7 && y < 9;
      return inFirst || inSecond ? [200, 30, 30] : [255, 255, 255];
    });
    const mask = floodFill(buffer, 1, 1, 10);
    const selectedCount = mask.reduce((sum, v) => sum + v, 0);
    expect(selectedCount).toBe(4);
    expect(mask[7 * 10 + 7]).toBe(0);
  });

  it("bridges a smooth gradient one small step at a time, even though the total start-to-end difference exceeds tolerance", () => {
    // A 1x20 strip stepping from gray 240 down to gray 50 in steps of 10.
    // Per-step RGB distance ≈ 17.3 (comfortably under tolerance 20); total
    // start-to-end distance ≈ 329 (far over tolerance 20). Local/adaptive
    // tolerance must bridge the whole strip; seed-only tolerance would have
    // stopped after 1-2 steps.
    const width = 20;
    const height = 1;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let x = 0; x < width; x++) {
      const value = 240 - x * 10;
      const i = x * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
    const buffer: PixelBuffer = { data, width, height };

    const mask = floodFill(buffer, 0, 0, 20);
    const selectedCount = mask.reduce((sum, v) => sum + v, 0);
    expect(selectedCount).toBe(width);
  });

  it("still stops at a genuine hard edge even with local/adaptive tolerance", () => {
    // A gentle 5-pixel gray gradient (200 down to 160, step 10) followed by
    // an abrupt jump to unrelated bright red for the remaining 5 pixels.
    const width = 10;
    const height = 1;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let x = 0; x < 5; x++) {
      const value = 200 - x * 10;
      const i = x * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
    for (let x = 5; x < 10; x++) {
      const i = x * 4;
      data[i] = 255;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
    const buffer: PixelBuffer = { data, width, height };

    const mask = floodFill(buffer, 0, 0, 20);
    const selectedCount = mask.reduce((sum, v) => sum + v, 0);
    expect(selectedCount).toBe(5);
    expect(mask[4]).toBe(1);
    expect(mask[5]).toBe(0);
  });

  it("throws a RangeError for an out-of-bounds seed", () => {
    const buffer = makeBuffer(5, 5, () => [255, 255, 255]);
    expect(() => floodFill(buffer, 10, 10, 10)).toThrow(RangeError);
  });
});
