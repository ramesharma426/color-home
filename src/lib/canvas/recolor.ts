import { rgbToHsl, hslToRgb } from "./colorMath";
import type { PixelBuffer, RGBColor } from "./types";

export function recolor(
  buffer: PixelBuffer,
  mask: Uint8Array,
  targetColor: RGBColor
): PixelBuffer {
  const output = new Uint8ClampedArray(buffer.data);
  const targetHsl = rgbToHsl(targetColor);

  for (let pixelIndex = 0; pixelIndex < mask.length; pixelIndex++) {
    if (!mask[pixelIndex]) continue;

    const offset = pixelIndex * 4;
    const original = {
      r: buffer.data[offset],
      g: buffer.data[offset + 1],
      b: buffer.data[offset + 2],
    };
    const originalLightness = rgbToHsl(original).l;

    const recolored = hslToRgb({
      h: targetHsl.h,
      s: targetHsl.s,
      l: originalLightness,
    });

    output[offset] = recolored.r;
    output[offset + 1] = recolored.g;
    output[offset + 2] = recolored.b;
    // alpha (offset + 3) is left untouched by the Uint8ClampedArray copy above
  }

  return { data: output, width: buffer.width, height: buffer.height };
}
