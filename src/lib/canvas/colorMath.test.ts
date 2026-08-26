import { describe, expect, it } from "vitest";
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from "./colorMath";

describe("hexToRgb", () => {
  it("parses a 6-digit hex string", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("#007e3c")).toEqual({ r: 0, g: 126, b: 60 });
  });

  it("parses without a leading #", () => {
    expect(hexToRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });
});

describe("rgbToHex", () => {
  it("formats as a lowercase 6-digit hex string with a leading #", () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe("#ff0000");
    expect(rgbToHex({ r: 0, g: 126, b: 60 })).toBe("#007e3c");
  });
});

describe("rgbToHsl / hslToRgb", () => {
  it("converts pure red correctly", () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(hsl.h).toBeCloseTo(0, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });

  it("round-trips rgb -> hsl -> rgb within rounding error", () => {
    const original = { r: 120, g: 200, b: 60 };
    const roundTripped = hslToRgb(rgbToHsl(original));
    expect(roundTripped.r).toBeCloseTo(original.r, -1);
    expect(roundTripped.g).toBeCloseTo(original.g, -1);
    expect(roundTripped.b).toBeCloseTo(original.b, -1);
  });

  it("converts gray (zero saturation) correctly", () => {
    const hsl = rgbToHsl({ r: 128, g: 128, b: 128 });
    expect(hsl.s).toBeCloseTo(0, 0);
    expect(hsl.l).toBeCloseTo(50, 0);
  });
});
