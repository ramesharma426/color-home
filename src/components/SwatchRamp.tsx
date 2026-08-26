import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from "@/lib/canvas/colorMath";

/**
 * The signature element: a value ramp.
 *
 * Color Home does not flood a wall with flat paint — it keeps the hue and
 * saturation of the chosen paint and takes the lightness of every pixel
 * straight from the photograph. This strip shows a colour rendered exactly the
 * way the Studio would render it: one pigment carried across the run of values
 * a real wall has, from deep shade on the left to direct sun on the right.
 *
 * It is the same maths as `recolor()` — hue and saturation held, lightness
 * swept — so what a customer sees on a chip is what they get on their wall.
 */
const SHADE_FACTOR = 0.55; // deepest step, as a fraction of the colour's own lightness
const SUN_REACH = 0.5; // how far the brightest step travels toward white

export function rampStops(hex: string, steps: number): string[] {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));
  const low = l * SHADE_FACTOR;
  const high = l + (100 - l) * SUN_REACH;

  // Piecewise around the colour's own lightness, so the middle step of an
  // odd-length ramp is the paint exactly as the card lists it.
  return Array.from({ length: steps }, (_, index) => {
    const t = steps === 1 ? 0.5 : index / (steps - 1);
    const lightness = t < 0.5 ? low + (l - low) * (t / 0.5) : l + (high - l) * ((t - 0.5) / 0.5);
    return rgbToHex(hslToRgb({ h, s, l: lightness }));
  });
}

export function SwatchRamp({
  hex,
  steps = 5,
  className = "",
  animate = false,
}: {
  hex: string;
  steps?: number;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div className={`flex w-full ${className}`} aria-hidden="true">
      {rampStops(hex, steps).map((stop, index) => (
        <div
          key={index}
          className={`h-full flex-1 ${animate ? "ramp-step" : ""}`}
          style={{
            backgroundColor: stop,
            animationDelay: animate ? `${120 + index * 70}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}
