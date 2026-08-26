import { describe, expect, it } from "vitest";
import { computeBorderMask } from "./borderMask";

function makeSquareMask(width: number, height: number, x0: number, y0: number, size: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      mask[y * width + x] = 1;
    }
  }
  return mask;
}

describe("computeBorderMask", () => {
  it("returns the outer ring of a solid square at thickness 1", () => {
    const mask = makeSquareMask(10, 10, 2, 2, 6); // 6x6 square, 36 pixels
    const border = computeBorderMask(mask, 10, 10, 1);
    const borderCount = border.reduce((sum, v) => sum + v, 0);
    expect(borderCount).toBe(20); // 36 total - 16 interior (4x4 after one erosion)
    // A corner of the square must be in the border; the exact center must not be.
    expect(border[2 * 10 + 2]).toBe(1);
    expect(border[4 * 10 + 4]).toBe(0);
  });

  it("returns a thicker ring at thickness 2", () => {
    const mask = makeSquareMask(10, 10, 2, 2, 6);
    const border = computeBorderMask(mask, 10, 10, 2);
    const borderCount = border.reduce((sum, v) => sum + v, 0);
    expect(borderCount).toBe(32); // 36 total - 4 interior (2x2 after two erosions)
  });

  it("treats pixels outside the buffer as outside the mask, so a mask touching the edge borders there too", () => {
    const mask = new Uint8Array(25).fill(1); // entire 5x5 buffer selected
    const border = computeBorderMask(mask, 5, 5, 1);
    // Every edge pixel has an out-of-bounds neighbor, so the whole 1px edge ring is border.
    expect(border[0]).toBe(1); // corner
    expect(border[2 * 5 + 2]).toBe(0); // center survives one erosion
  });

  it("returns an empty mask for an empty input", () => {
    const mask = new Uint8Array(100);
    const border = computeBorderMask(mask, 10, 10, 2);
    expect(border.reduce((sum, v) => sum + v, 0)).toBe(0);
  });
});
