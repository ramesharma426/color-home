import { describe, it, expect } from "vitest";
import { paintBrushStroke } from "./brushMask";

describe("paintBrushStroke", () => {
  it("stamps a filled circle around a single point", () => {
    const empty = new Uint8Array(20 * 20);
    const mask = paintBrushStroke(empty, 20, 20, [{ x: 10, y: 10 }], 3);
    expect(mask[10 * 20 + 10]).toBe(1); // center
    expect(mask[10 * 20 + 16]).toBe(0); // 6px away — outside a radius-3 circle
  });

  it("connects two far-apart points with no gaps", () => {
    const empty = new Uint8Array(30 * 10);
    // 20px apart with radius 2 — without interpolation there would be an
    // unpainted gap between the two stamped circles.
    const mask = paintBrushStroke(
      empty,
      30,
      10,
      [
        { x: 2, y: 5 },
        { x: 22, y: 5 },
      ],
      2
    );
    expect(mask[5 * 30 + 12]).toBe(1); // path midpoint must be filled
  });

  it("does not mutate the input mask", () => {
    const empty = new Uint8Array(10 * 10);
    paintBrushStroke(empty, 10, 10, [{ x: 5, y: 5 }], 2);
    expect(empty.every((v) => v === 0)).toBe(true);
  });

  it("unions with an existing mask rather than replacing it", () => {
    const existing = new Uint8Array(10 * 10);
    existing[0] = 1; // pixel (0,0) already selected
    const mask = paintBrushStroke(existing, 10, 10, [{ x: 8, y: 8 }], 2);
    expect(mask[0]).toBe(1); // still selected
    expect(mask[8 * 10 + 8]).toBe(1); // newly painted
  });
});
