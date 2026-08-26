import { describe, expect, it } from "vitest";
import { recolor } from "./recolor";
import { rgbToHsl } from "./colorMath";
import type { PixelBuffer } from "./types";

function singlePixelBuffer(r: number, g: number, b: number, a = 255): PixelBuffer {
  return { data: new Uint8ClampedArray([r, g, b, a]), width: 1, height: 1 };
}

describe("recolor", () => {
  it("preserves the original pixel's lightness while adopting the target hue/saturation", () => {
    const original = singlePixelBuffer(50, 60, 80); // dark, slightly blue
    const originalLightness = rgbToHsl({ r: 50, g: 60, b: 80 }).l;
    const targetRed = { r: 255, g: 0, b: 0 };

    const result = recolor(original, new Uint8Array([1]), targetRed);
    const resultHsl = rgbToHsl({ r: result.data[0], g: result.data[1], b: result.data[2] });

    expect(resultHsl.l).toBeCloseTo(originalLightness, 0);
    expect(resultHsl.h).toBeCloseTo(0, 0); // red's hue
    expect(resultHsl.s).toBeGreaterThan(50); // strongly saturated, like pure red
  });

  it("leaves unmasked pixels completely unchanged", () => {
    const data = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
    const buffer: PixelBuffer = { data, width: 2, height: 1 };
    const mask = new Uint8Array([1, 0]);

    const result = recolor(buffer, mask, { r: 255, g: 0, b: 0 });

    expect(Array.from(result.data.slice(4, 8))).toEqual([40, 50, 60, 255]);
  });

  it("preserves the alpha channel of every pixel, masked or not", () => {
    const buffer = singlePixelBuffer(10, 20, 30, 128);
    const result = recolor(buffer, new Uint8Array([1]), { r: 0, g: 255, b: 0 });
    expect(result.data[3]).toBe(128);
  });

  it("does not mutate the input buffer", () => {
    const buffer = singlePixelBuffer(10, 20, 30);
    const originalCopy = Uint8ClampedArray.from(buffer.data);
    recolor(buffer, new Uint8Array([1]), { r: 255, g: 0, b: 0 });
    expect(Array.from(buffer.data)).toEqual(Array.from(originalCopy));
  });
});
