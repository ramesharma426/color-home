import type { PaintColor } from "./types";

/**
 * Transcribed from a photographed Berger "Yellows & Oranges" swatch card
 * (see docs/colors/berger-yellows-oranges.md for the raw source). The card
 * gives only a name and a Berger product code, never a hex value, and says
 * shades shown are indicative only — these hex values are visually estimated
 * from the photo, not sampled from an official source. Surface that caveat
 * in any UI that shows these colors; confirm against the physical Berger
 * ColorBank fandeck before using for a real tinting order.
 */
export const bergerYellowsOranges: PaintColor[] = [
  { name: "Long Beach", code: "2P 0034", hex: "#f0ead6", category: "facade" },
  { name: "Firefly Glow", code: "2P 0689", hex: "#ede2c0", category: "facade" },
  { name: "Bikini Beach", code: "7T 1596", hex: "#e8c9a0", category: "facade" },
  { name: "Lemon Organza", code: "3P 0069", hex: "#f2e9b8", category: "facade" },
  { name: "Silky Scarf", code: "3P 0055", hex: "#eedda0", category: "facade" },
  { name: "Sundrenched Sand", code: "7T 1589", hex: "#d9a876", category: "facade" },
  { name: "Celebration Sun", code: "3T 0763", hex: "#f0e2a0", category: "facade" },
  { name: "Late Day Sun", code: "2T 0669", hex: "#e8a93c", category: "facade" },
  { name: "Southwest Sun", code: "2D 0718", hex: "#dfa23a", category: "facade" },
  { name: "Golden Tortilla", code: "3T 0781", hex: "#e8d27a", category: "facade" },
  { name: "The Gold Coast", code: "2D 0710", hex: "#dfa33e", category: "facade" },
  { name: "Amberly", code: "7D 1614", hex: "#c98f5e", category: "facade" },
  { name: "Summer Sun", code: "3A 0386", hex: "#f0b429", category: "trim" },
  { name: "Yellow Zodiac", code: "3A 0388", hex: "#e8a233", category: "trim" },
  { name: "Sienna Sunset", code: "2A 0712", hex: "#d9791e", category: "trim" },
  { name: "Sydney", code: "7A 1592", hex: "#7a5230", category: "trim" },
  { name: "Belle Amber", code: "2A 0680", hex: "#b96a32", category: "trim" },
  { name: "Brown Sugar Sprinkles", code: "7A 1624", hex: "#7a3b28", category: "trim" },
  { name: "Ginger Twish", code: "2A 0600", hex: "#c1602a", category: "roof" },
  { name: "Signal Red", code: "D 533", hex: "#c1272d", category: "roof" },
  { name: "Red Wall", code: "7A 1656", hex: "#7a2a28", category: "roof" },
];
