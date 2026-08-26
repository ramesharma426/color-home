# Color Home Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Color Home — a static Next.js site where a customer uploads a photo of their home, magic-wand-selects regions (wall/trim/roof), assigns each a paint color, and downloads a realistic recolored result.

**Architecture:** Fully client-side Next.js app (`output: 'export'`) with no backend. Region selection (flood fill) and recoloring (hue/saturation replace, lightness preserved) are pure, DOM-free functions run inside a Web Worker so pixel math never blocks the UI. Berger paint colors ship as static typed data.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind CSS, Vitest for unit tests, `@playwright/test` for one end-to-end flow test, GitHub Actions → GitHub Pages for deployment.

**Spec:** `docs/superpowers/specs/2026-08-26-color-home-studio-design.md`

## Global Constraints

- Static export only (`output: 'export'` in `next.config.mjs`) — no API routes, no server-only APIs (no `next/headers`, no dynamic route handlers).
- No persistence between visits. Nothing written to `localStorage`/`IndexedDB`/cookies in this plan.
- No canvas/state-management library — flood fill and recolor are hand-written; UI state is plain React state.
- All pixel processing (flood fill, recolor) must be usable without a DOM — implemented as pure functions over a plain `PixelBuffer` shape, not the browser's `ImageData` class directly, so they run in Vitest's default `node` environment with no `jsdom`.
- Photos are downscaled to a max of 1600px on the long edge before any pixel processing.
- Berger hex values in `src/data/palettes/berger-yellows-oranges.ts` are **visually estimated** from the photographed swatch card (the card itself gives no hex, only name + product code). This must be stated in a code comment and surfaced in the Colors page UI, not just the doc.

---

### Task 1: Project scaffold — static Next.js app

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `next-env.d.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `.gitignore`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Interfaces:**
- Produces: a Next.js app buildable with `npm run build`, emitting static files to `out/`. All later tasks add files under `src/`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "color-home",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
```

- [ ] **Step 4: Write `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 5: Write `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Write `postcss.config.mjs`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Write `.gitignore`**

```
node_modules/
.next/
out/
*.log
.DS_Store
```

- [ ] **Step 8: Write `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Write `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Color Home",
  description: "Preview paint colors on your own home before you buy.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Write placeholder `src/app/page.tsx`**

```tsx
export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Color Home</h1>
    </main>
  );
}
```

- [ ] **Step 11: Install dependencies and verify the static build**

Run: `npm install`
Run: `npm run build`
Expected: build succeeds and creates an `out/` directory containing `index.html`.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs next-env.d.ts tailwind.config.ts postcss.config.mjs .gitignore src/app/globals.css src/app/layout.tsx src/app/page.tsx
git commit -m "chore: scaffold static Next.js app"
```

---

### Task 2: Color math utilities + Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/canvas/types.ts`
- Create: `src/lib/canvas/colorMath.ts`
- Test: `src/lib/canvas/colorMath.test.ts`

**Interfaces:**
- Produces: `RGBColor { r: number; g: number; b: number }`, `HSLColor { h: number; s: number; l: number }` (from `types.ts`); `hexToRgb(hex: string): RGBColor`, `rgbToHex(rgb: RGBColor): string`, `rgbToHsl(rgb: RGBColor): HSLColor`, `hslToRgb(hsl: HSLColor): RGBColor` (from `colorMath.ts`). These are used by Tasks 3, 5, 11.

- [ ] **Step 1: Add Vitest devDependency and config**

Add to `package.json` devDependencies: `"vitest": "^2.1.0"` (already added in Task 1 — confirm it's present).

Write `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write `src/lib/canvas/types.ts`**

```ts
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface PixelBuffer {
  data: Uint8ClampedArray; // RGBA, length === width * height * 4
  width: number;
  height: number;
}
```

- [ ] **Step 3: Write the failing tests**

```ts
// src/lib/canvas/colorMath.test.ts
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
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/lib/canvas/colorMath.test.ts`
Expected: FAIL with "Cannot find module './colorMath'" (file doesn't exist yet).

- [ ] **Step 5: Write `src/lib/canvas/colorMath.ts`**

```ts
import type { RGBColor, HSLColor } from "./types";

export function hexToRgb(hex: string): RGBColor {
  const clean = hex.replace(/^#/, "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

export function rgbToHex(rgb: RGBColor): string {
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function rgbToHsl({ r, g, b }: RGBColor): HSLColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let h: number;
  if (max === rn) {
    h = ((gn - bn) / delta) % 6;
  } else if (max === gn) {
    h = (bn - rn) / delta + 2;
  } else {
    h = (rn - gn) / delta + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSLColor): RGBColor {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/canvas/colorMath.test.ts`
Expected: PASS (all 6 tests)

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/lib/canvas/types.ts src/lib/canvas/colorMath.ts src/lib/canvas/colorMath.test.ts package.json
git commit -m "feat: add color math utilities with tests"
```

---

### Task 3: Berger palette data model

**Files:**
- Create: `src/data/palettes/types.ts`
- Create: `src/data/palettes/berger-yellows-oranges.ts`
- Test: `src/data/palettes/berger-yellows-oranges.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `PaintCategory = "facade" | "trim" | "roof"`, `PaintColor { name: string; code: string; hex: string; category: PaintCategory }`, `bergerYellowsOranges: PaintColor[]` — consumed by Task 11 (`PaletteBrowser`) and Task 14 (Colors page).

- [ ] **Step 1: Write the failing test**

```ts
// src/data/palettes/berger-yellows-oranges.test.ts
import { describe, expect, it } from "vitest";
import { bergerYellowsOranges } from "./berger-yellows-oranges";

describe("bergerYellowsOranges", () => {
  it("has 21 entries", () => {
    expect(bergerYellowsOranges).toHaveLength(21);
  });

  it("every entry has a valid 6-digit hex color", () => {
    for (const color of bergerYellowsOranges) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("every name and code is unique", () => {
    const names = bergerYellowsOranges.map((c) => c.name);
    const codes = bergerYellowsOranges.map((c) => c.code);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has the expected count per category", () => {
    const byCategory = (category: string) =>
      bergerYellowsOranges.filter((c) => c.category === category).length;
    expect(byCategory("facade")).toBe(12);
    expect(byCategory("trim")).toBe(6);
    expect(byCategory("roof")).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/palettes/berger-yellows-oranges.test.ts`
Expected: FAIL with "Cannot find module './berger-yellows-oranges'"

- [ ] **Step 3: Write `src/data/palettes/types.ts`**

```ts
export type PaintCategory = "facade" | "trim" | "roof";

export interface PaintColor {
  name: string;
  code: string;
  hex: string;
  category: PaintCategory;
}
```

- [ ] **Step 4: Write `src/data/palettes/berger-yellows-oranges.ts`**

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/palettes/berger-yellows-oranges.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/data/palettes/types.ts src/data/palettes/berger-yellows-oranges.ts src/data/palettes/berger-yellows-oranges.test.ts
git commit -m "feat: add Berger yellows & oranges palette data"
```

---

### Task 4: Flood fill algorithm

**Files:**
- Create: `src/lib/canvas/floodFill.ts`
- Test: `src/lib/canvas/floodFill.test.ts`

**Interfaces:**
- Consumes: `PixelBuffer` from `src/lib/canvas/types.ts` (Task 2).
- Produces: `floodFill(buffer: PixelBuffer, seedX: number, seedY: number, tolerance: number): Uint8Array` — a mask, length `width * height`, `1` = selected. Consumed by Task 7 (worker) and indirectly Task 9 (`ColorStudio`).

- [ ] **Step 1: Write a small test fixture helper and the failing tests**

```ts
// src/lib/canvas/floodFill.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/canvas/floodFill.test.ts`
Expected: FAIL with "Cannot find module './floodFill'"

- [ ] **Step 3: Write `src/lib/canvas/floodFill.ts`**

```ts
import type { PixelBuffer } from "./types";

export function floodFill(
  buffer: PixelBuffer,
  seedX: number,
  seedY: number,
  tolerance: number
): Uint8Array {
  const { data, width, height } = buffer;

  if (seedX < 0 || seedX >= width || seedY < 0 || seedY >= height) {
    throw new RangeError(
      `Seed point (${seedX}, ${seedY}) is outside the ${width}x${height} buffer`
    );
  }

  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const toleranceSquared = tolerance * tolerance;

  const pixelAt = (index: number) => {
    const offset = index * 4;
    return { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
  };

  const seedIndex = seedY * width + seedX;
  const seedColor = pixelAt(seedIndex);

  const withinTolerance = (index: number) => {
    const { r, g, b } = pixelAt(index);
    const dr = r - seedColor.r;
    const dg = g - seedColor.g;
    const db = b - seedColor.b;
    return dr * dr + dg * dg + db * db <= toleranceSquared;
  };

  const stack: number[] = [seedIndex];
  visited[seedIndex] = 1;

  while (stack.length > 0) {
    const index = stack.pop()!;
    if (!withinTolerance(index)) continue;

    mask[index] = 1;
    const x = index % width;
    const y = Math.floor(index / width);

    const neighbors: Array<[number, number]> = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const neighborIndex = ny * width + nx;
      if (visited[neighborIndex]) continue;
      visited[neighborIndex] = 1;
      stack.push(neighborIndex);
    }
  }

  return mask;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/canvas/floodFill.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/canvas/floodFill.ts src/lib/canvas/floodFill.test.ts
git commit -m "feat: add flood fill region selection with tests"
```

---

### Task 5: Recolor algorithm

**Files:**
- Create: `src/lib/canvas/recolor.ts`
- Test: `src/lib/canvas/recolor.test.ts`

**Interfaces:**
- Consumes: `PixelBuffer`, `RGBColor` (Task 2 `types.ts`), `rgbToHsl`/`hslToRgb` (Task 2 `colorMath.ts`).
- Produces: `recolor(buffer: PixelBuffer, mask: Uint8Array, targetColor: RGBColor): PixelBuffer` — a new buffer, same dimensions, masked pixels recolored. Consumed by Task 7 (worker).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/canvas/recolor.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/canvas/recolor.test.ts`
Expected: FAIL with "Cannot find module './recolor'"

- [ ] **Step 3: Write `src/lib/canvas/recolor.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/canvas/recolor.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/canvas/recolor.ts src/lib/canvas/recolor.test.ts
git commit -m "feat: add lightness-preserving recolor with tests"
```

---

### Task 6: Image downscale helper

**Files:**
- Create: `src/lib/image/downscale.ts`
- Test: `src/lib/image/downscale.test.ts`

**Interfaces:**
- Produces: `fitWithinMax(width: number, height: number, maxDimension: number): { width: number; height: number }`. Consumed by Task 8 (`PhotoUploader`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/image/downscale.test.ts
import { describe, expect, it } from "vitest";
import { fitWithinMax } from "./downscale";

describe("fitWithinMax", () => {
  it("leaves an image unchanged if already within the max dimension", () => {
    expect(fitWithinMax(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("scales down a landscape image preserving aspect ratio", () => {
    expect(fitWithinMax(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("scales down a portrait image preserving aspect ratio", () => {
    expect(fitWithinMax(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("scales down a square image", () => {
    expect(fitWithinMax(5000, 5000, 1600)).toEqual({ width: 1600, height: 1600 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/image/downscale.test.ts`
Expected: FAIL with "Cannot find module './downscale'"

- [ ] **Step 3: Write `src/lib/image/downscale.ts`**

```ts
export function fitWithinMax(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/image/downscale.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/image/downscale.ts src/lib/image/downscale.test.ts
git commit -m "feat: add image downscale-dimension helper with tests"
```

---

### Task 7: Web Worker wrapping flood fill + recolor

**Files:**
- Create: `src/lib/canvas/worker.ts`
- Create: `src/lib/canvas/useCanvasWorker.ts`

**Interfaces:**
- Consumes: `floodFill` (Task 4), `recolor` (Task 5), `PixelBuffer`/`RGBColor` (Task 2).
- Produces: a `useCanvasWorker()` React hook exposing `runFloodFill(buffer, seedX, seedY, tolerance): Promise<Uint8Array>` and `runRecolor(buffer, mask, color): Promise<PixelBuffer>`. Consumed by Task 9 (`ColorStudio`).
- Message contract (worker.ts <-> useCanvasWorker.ts): requests are `{ id: string; type: "floodFill"; buffer; seedX; seedY; tolerance }` or `{ id: string; type: "recolor"; buffer; mask; targetColor }`; responses are `{ id: string; type: "floodFillResult"; mask }` or `{ id: string; type: "recolorResult"; buffer }`.

This task has no unit tests: Web Workers require a browser-like environment that Vitest's `node` environment doesn't provide, and the logic being wrapped (`floodFill`, `recolor`) is already covered by Tasks 4-5. Correctness of the worker wiring itself is verified manually in Task 9 (visually, via the running dev server) and by the Task 17 Playwright test, which exercises the whole flow in a real browser.

- [ ] **Step 1: Write `src/lib/canvas/worker.ts`**

```ts
import { floodFill } from "./floodFill";
import { recolor } from "./recolor";
import type { PixelBuffer, RGBColor } from "./types";

type FloodFillRequest = {
  id: string;
  type: "floodFill";
  buffer: PixelBuffer;
  seedX: number;
  seedY: number;
  tolerance: number;
};

type RecolorRequest = {
  id: string;
  type: "recolor";
  buffer: PixelBuffer;
  mask: Uint8Array;
  targetColor: RGBColor;
};

type WorkerRequest = FloodFillRequest | RecolorRequest;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === "floodFill") {
    const mask = floodFill(request.buffer, request.seedX, request.seedY, request.tolerance);
    self.postMessage({ id: request.id, type: "floodFillResult", mask });
    return;
  }

  if (request.type === "recolor") {
    const buffer = recolor(request.buffer, request.mask, request.targetColor);
    self.postMessage({ id: request.id, type: "recolorResult", buffer });
    return;
  }
};
```

- [ ] **Step 2: Write `src/lib/canvas/useCanvasWorker.ts`**

```ts
"use client";

import { useEffect, useRef } from "react";
import type { PixelBuffer, RGBColor } from "./types";

type PendingResolver = (value: any) => void;

export function useCanvasWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingResolver>>(new Map());

  useEffect(() => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent) => {
      const { id, ...result } = event.data;
      const resolve = pendingRef.current.get(id);
      if (resolve) {
        resolve(result);
        pendingRef.current.delete(id);
      }
    };
    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  function send<T>(request: object): Promise<T> {
    const worker = workerRef.current;
    if (!worker) {
      throw new Error("Canvas worker is not ready yet");
    }
    const id = crypto.randomUUID();
    return new Promise<T>((resolve) => {
      pendingRef.current.set(id, resolve);
      worker.postMessage({ id, ...request });
    });
  }

  async function runFloodFill(
    buffer: PixelBuffer,
    seedX: number,
    seedY: number,
    tolerance: number
  ): Promise<Uint8Array> {
    const result = await send<{ mask: Uint8Array }>({
      type: "floodFill",
      buffer,
      seedX,
      seedY,
      tolerance,
    });
    return result.mask;
  }

  async function runRecolor(
    buffer: PixelBuffer,
    mask: Uint8Array,
    targetColor: RGBColor
  ): Promise<PixelBuffer> {
    const result = await send<{ buffer: PixelBuffer }>({
      type: "recolor",
      buffer,
      mask,
      targetColor,
    });
    return result.buffer;
  }

  return { runFloodFill, runRecolor };
}
```

- [ ] **Step 3: Verify the static build still bundles the worker**

The `new Worker(new URL("./worker.ts", import.meta.url))` pattern needs to survive Next's static-export bundling — this can't wait for Task 9's manual test, since a bundler failure here should be caught at the source.

Run: `npm run build`
Expected: build succeeds with no errors about `Worker`, `import.meta.url`, or resolving `./worker.ts`. If it fails, this is a real blocker for this task, not something to defer — Next.js may need `next.config.mjs` adjusted (e.g. confirming the default webpack build, not Turbopack, handles `new URL(..., import.meta.url)` workers; consult current Next.js docs for the installed version if this fails, since worker-bundling support has changed across versions).

- [ ] **Step 4: Commit**

```bash
git add src/lib/canvas/worker.ts src/lib/canvas/useCanvasWorker.ts
git commit -m "feat: run flood fill and recolor in a web worker"
```

---

### Task 8: PhotoUploader component

**Files:**
- Create: `src/components/PhotoUploader.tsx`

**Interfaces:**
- Consumes: `fitWithinMax` (Task 6).
- Produces: `<PhotoUploader onPhotoReady={(bitmap: ImageBitmap) => void} />`. Consumed by Task 13 (Studio page).

- [ ] **Step 1: Write `src/components/PhotoUploader.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { fitWithinMax } from "@/lib/image/downscale";

const MAX_DIMENSION = 1600;

export function PhotoUploader({
  onPhotoReady,
}: {
  onPhotoReady: (bitmap: ImageBitmap) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image. Please choose a photo.");
      return;
    }
    setError(null);

    const rawBitmap = await createImageBitmap(file);
    const { width, height } = fitWithinMax(rawBitmap.width, rawBitmap.height, MAX_DIMENSION);
    const resizedBitmap = await createImageBitmap(rawBitmap, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
    });
    onPhotoReady(resizedBitmap);
  }

  return (
    <div
      className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <p className="mb-4 text-slate-600">
        Drag a photo here, or take one with your phone.
      </p>
      <button
        type="button"
        className="rounded-lg bg-slate-900 px-4 py-2 text-white"
        onClick={() => inputRef.current?.click()}
      >
        Choose a photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, visit a page that renders `<PhotoUploader>` (temporarily mount it in `src/app/page.tsx` if the Studio page from Task 13 doesn't exist yet), drop/upload an image, confirm `onPhotoReady` fires (log the bitmap's `width`/`height` to the console) and that a non-image file shows the error message.

- [ ] **Step 3: Commit**

```bash
git add src/components/PhotoUploader.tsx
git commit -m "feat: add photo upload/capture component"
```

---

### Task 9: ColorStudio component (canvas + region state)

**Files:**
- Create: `src/lib/canvas/imageBitmapToBuffer.ts`
- Create: `src/components/ColorStudio.tsx`

**Interfaces:**
- Consumes: `useCanvasWorker` (Task 7), `PixelBuffer`/`RGBColor` (Task 2).
- Produces: `imageBitmapToBuffer(bitmap: ImageBitmap): PixelBuffer`; `Region { id: string; mask: Uint8Array; color: RGBColor | null; label: string; recoloredData?: Uint8ClampedArray }`; `<ColorStudio photo={ImageBitmap} />` which owns the canvas, click-to-wand handling, and `regions: Region[]` state.

**Sequencing note:** `RegionList` (Task 10) and `PaletteBrowser` (Task 11) do not exist yet when this task runs — Task 9 is dispatched before them. This task therefore renders a minimal inline placeholder sidebar instead of importing those components; Task 12 (dispatched last of the three) wires all three into `ColorStudio.tsx` once they all exist. Do not import `./RegionList`, `./PaletteBrowser`, or `./DownloadButton` in this task — those modules do not exist on disk yet and the build will fail.

- [ ] **Step 1: Write `src/lib/canvas/imageBitmapToBuffer.ts`**

```ts
import type { PixelBuffer } from "./types";

export function imageBitmapToBuffer(bitmap: ImageBitmap): PixelBuffer {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is not available");
  }
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { data: imageData.data, width: imageData.width, height: imageData.height };
}
```

- [ ] **Step 2: Write `src/components/ColorStudio.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvasWorker } from "@/lib/canvas/useCanvasWorker";
import { imageBitmapToBuffer } from "@/lib/canvas/imageBitmapToBuffer";
import type { PixelBuffer, RGBColor } from "@/lib/canvas/types";

export interface Region {
  id: string;
  mask: Uint8Array;
  color: RGBColor | null;
  label: string;
  recoloredData?: Uint8ClampedArray;
}

const DEFAULT_TOLERANCE = 24;

export function ColorStudio({ photo }: { photo: ImageBitmap }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseBufferRef = useRef<PixelBuffer | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);
  const { runFloodFill, runRecolor } = useCanvasWorker();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = photo.width;
    canvas.height = photo.height;
    baseBufferRef.current = imageBitmapToBuffer(photo);
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  function render() {
    const canvas = canvasRef.current;
    const baseBuffer = baseBufferRef.current;
    if (!canvas || !baseBuffer) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Composite each region's recolored pixels over the base photo, one
    // mask at a time, so multiple regions with different colors coexist —
    // do NOT replace the whole buffer with the last region's recoloredData,
    // that would discard every earlier region.
    const composed = new Uint8ClampedArray(baseBuffer.data);
    for (const region of regions) {
      if (!region.recoloredData) continue;
      for (let pixelIndex = 0; pixelIndex < region.mask.length; pixelIndex++) {
        if (!region.mask[pixelIndex]) continue;
        const offset = pixelIndex * 4;
        composed[offset] = region.recoloredData[offset];
        composed[offset + 1] = region.recoloredData[offset + 1];
        composed[offset + 2] = region.recoloredData[offset + 2];
        composed[offset + 3] = region.recoloredData[offset + 3];
      }
    }
    ctx.putImageData(new ImageData(composed, baseBuffer.width, baseBuffer.height), 0, 0);
  }

  async function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const baseBuffer = baseBufferRef.current;
    if (!canvas || !baseBuffer) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);

    const mask = await runFloodFill(baseBuffer, x, y, tolerance);
    const id = crypto.randomUUID();
    setRegions((prev) => [...prev, { id, mask, color: null, label: `Region ${prev.length + 1}` }]);
    setActiveRegionId(id);
  }

  async function handleColorSelect(color: RGBColor) {
    const baseBuffer = baseBufferRef.current;
    if (!baseBuffer || !activeRegionId) return;

    const region = regions.find((r) => r.id === activeRegionId);
    if (!region) return;

    const recoloredBuffer = await runRecolor(baseBuffer, region.mask, color);
    setRegions((prev) =>
      prev.map((r) =>
        r.id === activeRegionId ? { ...r, color, recoloredData: recoloredBuffer.data } : r
      )
    );
  }

  useEffect(render, [regions]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <label className="mb-2 block text-sm text-slate-600">
          Sensitivity: {tolerance}
          <input
            type="range"
            min={5}
            max={80}
            value={tolerance}
            onChange={(event) => setTolerance(Number(event.target.value))}
            className="ml-3 align-middle"
          />
        </label>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full cursor-crosshair rounded-xl border border-slate-200"
        />
      </div>
      <div className="space-y-6">
        {/* Temporary placeholder — Task 12 replaces this with RegionList,
            PaletteBrowser, and DownloadButton once all three exist. */}
        <ul className="text-sm text-slate-600">
          {regions.map((region) => (
            <li key={region.id}>
              <button type="button" onClick={() => setActiveRegionId(region.id)}>
                {region.label}
                {region.id === activeRegionId ? " (active)" : ""}
              </button>
            </li>
          ))}
        </ul>
        {activeRegionId && (
          <input
            type="color"
            onChange={(event) => {
              const hex = event.target.value;
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              handleColorSelect({ r, g, b });
            }}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, mount `<ColorStudio photo={bitmap}>` behind a temporary `<PhotoUploader>` in `src/app/page.tsx`, upload a photo with at least two distinguishable flat-ish color areas, click the first area, pick a color via the placeholder color input, confirm it recolors; click a second, disconnected area, pick a *different* color, and confirm **both** regions show their own recolor at once (this is the check that catches a compositing bug where a later region's recolor would wipe out an earlier one). Confirm shadows/texture still show through the recolor rather than a flat fill.

- [ ] **Step 4: Commit**

```bash
git add src/lib/canvas/imageBitmapToBuffer.ts src/components/ColorStudio.tsx
git commit -m "feat: add ColorStudio canvas with click-to-wand region selection"
```

---

### Task 10: RegionList component

**Files:**
- Create: `src/components/RegionList.tsx`

**Interfaces:**
- Consumes: `Region` type (Task 9).
- Produces: `<RegionList regions={Region[]} activeRegionId={string | null} onSelectRegion={(id: string) => void} />`. Wired into `ColorStudio.tsx` by Task 12 (not Task 9 itself — Task 9 runs before this task exists).

- [ ] **Step 1: Write `src/components/RegionList.tsx`**

```tsx
"use client";

import type { Region } from "./ColorStudio";
import { rgbToHex } from "@/lib/canvas/colorMath";

export function RegionList({
  regions,
  activeRegionId,
  onSelectRegion,
}: {
  regions: Region[];
  activeRegionId: string | null;
  onSelectRegion: (id: string) => void;
}) {
  if (regions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Click a spot on the photo to select a wall, trim, or roof to recolor.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {regions.map((region) => (
        <li key={region.id}>
          <button
            type="button"
            onClick={() => onSelectRegion(region.id)}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${
              region.id === activeRegionId ? "border-slate-900" : "border-slate-200"
            }`}
          >
            <span
              className="h-5 w-5 shrink-0 rounded-full border border-slate-300"
              style={{ backgroundColor: region.color ? rgbToHex(region.color) : "transparent" }}
            />
            <span className="text-sm">{region.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RegionList.tsx
git commit -m "feat: add region list sidebar"
```

---

### Task 11: PaletteBrowser component

**Files:**
- Create: `src/components/PaletteBrowser.tsx`

**Interfaces:**
- Consumes: `bergerYellowsOranges` (Task 3), `hexToRgb` (Task 2).
- Produces: `<PaletteBrowser onSelect={(color: RGBColor) => void} disabled={boolean} />`. Wired into `ColorStudio.tsx` by Task 12 (not Task 9 itself — Task 9 runs before this task exists). Task 14 (Colors page) does not reuse this component — it renders the palette data directly.

- [ ] **Step 1: Write `src/components/PaletteBrowser.tsx`**

```tsx
"use client";

import { bergerYellowsOranges } from "@/data/palettes/berger-yellows-oranges";
import { hexToRgb } from "@/lib/canvas/colorMath";
import type { RGBColor } from "@/lib/canvas/types";

const CATEGORY_LABELS: Record<string, string> = {
  facade: "Facade",
  trim: "Trims",
  roof: "Roofs",
};

export function PaletteBrowser({
  onSelect,
  disabled = false,
}: {
  onSelect: (color: RGBColor) => void;
  disabled?: boolean;
}) {
  const categories = ["facade", "trim", "roof"] as const;

  return (
    <div className={disabled ? "opacity-50" : undefined}>
      <p className="mb-2 text-xs text-slate-500">
        Berger colors shown are visually estimated from a printed swatch card — confirm against
        the physical fandeck before ordering paint.
      </p>
      {categories.map((category) => (
        <div key={category} className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">{CATEGORY_LABELS[category]}</h3>
          <div className="grid grid-cols-6 gap-2">
            {bergerYellowsOranges
              .filter((color) => color.category === category)
              .map((color) => (
                <button
                  key={color.code}
                  type="button"
                  title={color.name}
                  disabled={disabled}
                  onClick={() => onSelect(hexToRgb(color.hex))}
                  className="aspect-square rounded-md border border-slate-200"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
          </div>
        </div>
      ))}
      <label className="mt-2 block text-sm text-slate-600">
        Or pick any color:
        <input
          type="color"
          disabled={disabled}
          onChange={(event) => onSelect(hexToRgb(event.target.value))}
          className="ml-2 h-8 w-12 align-middle"
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PaletteBrowser.tsx
git commit -m "feat: add palette browser with Berger swatches and free picker"
```

---

### Task 12: DownloadButton component

**Files:**
- Create: `src/components/DownloadButton.tsx`

**Interfaces:**
- Consumes: a ref to the canvas already rendered by `ColorStudio` (Task 9).
- Produces: `<DownloadButton canvasRef={React.RefObject<HTMLCanvasElement>} />`.
- Also modifies: `src/components/ColorStudio.tsx` (Task 9) — this task is the one that wires the real sidebar in, since by now `RegionList` (Task 10), `PaletteBrowser` (Task 11), and `DownloadButton` (this task) all exist. Task 9 deliberately left a placeholder there instead of importing components that didn't exist yet.

- [ ] **Step 1: Write `src/components/DownloadButton.tsx`**

```tsx
"use client";

export function DownloadButton({
  canvasRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) {
  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "color-home-preview.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white"
    >
      Download result
    </button>
  );
}
```

- [ ] **Step 2: Wire `RegionList`, `PaletteBrowser`, and `DownloadButton` into `ColorStudio.tsx`**

In `src/components/ColorStudio.tsx`, replace the placeholder sidebar `<div className="space-y-6">...</div>` block (the one with the comment `Temporary placeholder`) with the real composition:

```tsx
      <div className="space-y-6">
        <RegionList regions={regions} activeRegionId={activeRegionId} onSelectRegion={setActiveRegionId} />
        <PaletteBrowser onSelect={handleColorSelect} disabled={!activeRegionId} />
        <DownloadButton canvasRef={canvasRef} />
      </div>
```

Add the three imports at the top of the file, alongside the existing ones:

```tsx
import { RegionList } from "./RegionList";
import { PaletteBrowser } from "./PaletteBrowser";
import { DownloadButton } from "./DownloadButton";
```

- [ ] **Step 3: Manual verification of the full flow**

Run: `npm run dev`, mount `<ColorStudio photo={bitmap}>` behind a temporary `<PhotoUploader>` in `src/app/page.tsx` (or wait for Task 13's real Studio page if it's already done). Upload a real photo, click a wall area, pick a Berger swatch from the real `PaletteBrowser`, confirm the region list shows it, click a second disconnected area, assign a different color, confirm both regions keep their own color at once, then click "Download result" and confirm a PNG downloads and opens correctly.

- [ ] **Step 4: Commit**

```bash
git add src/components/DownloadButton.tsx src/components/ColorStudio.tsx
git commit -m "feat: add download button and wire the full Studio sidebar"
```

---

### Task 13: Studio page assembly

**Files:**
- Create: `src/app/studio/page.tsx`

**Interfaces:**
- Consumes: `PhotoUploader` (Task 8), `ColorStudio` (Task 9).

- [ ] **Step 1: Write `src/app/studio/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { ColorStudio } from "@/components/ColorStudio";

export default function StudioPage() {
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Color Home Studio</h1>
      <p className="mb-6 text-sm text-slate-500">
        Screens make color by mixing glowing red, green, and blue light; paint makes color by
        reflecting light off pigment on a wall — the same color will never look perfectly
        identical between the two. Your monitor's calibration, the lighting this photo was
        taken in, and the lighting in your actual room all shift how a color reads as well.
        Treat this preview as a guide to the overall look, not an exact match — always confirm
        with a physical paint swatch in your own room's lighting before ordering.
      </p>
      {photo ? (
        <ColorStudio photo={photo} />
      ) : (
        <PhotoUploader onPhotoReady={setPhoto} />
      )}
    </main>
  );
}
```

**Added per explicit owner feedback (2026-08-27):** the disclaimer paragraph above — first added as a plain "colors may vary" notice, then the owner asked for it to actually explain *why* (screens emit RGB light, paint reflects pigment, plus monitor calibration and lighting differences), revised to the current wording. Distinct from the Berger-swatch-specific caveat already planned for Task 11/14 (which is about the swatch hex being estimated from a photographed card, not about screen/lighting variance). Keep both — they cover different sources of inaccuracy.

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, visit `/studio`, complete the full flow: upload a real photo → click a wall → assign a Berger color → click a second region (e.g. trim) → assign a different color → download. Confirm both regions keep their own color simultaneously.

Run: `npm run build` — confirm the static export still succeeds with the new route.

- [ ] **Step 3: Commit**

```bash
git add src/app/studio/page.tsx
git commit -m "feat: assemble the Studio page"
```

---

### Task 14: Colors page (palette gallery)

**Files:**
- Create: `src/app/colors/page.tsx`

**Interfaces:**
- Consumes: `bergerYellowsOranges` (Task 3).

- [ ] **Step 1: Write `src/app/colors/page.tsx`**

```tsx
import { bergerYellowsOranges } from "@/data/palettes/berger-yellows-oranges";

const CATEGORY_LABELS: Record<string, string> = {
  facade: "Facade",
  trim: "Trims",
  roof: "Roofs",
};

export default function ColorsPage() {
  const categories = ["facade", "trim", "roof"] as const;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">Berger Yellows & Oranges</h1>
      <p className="mb-6 text-sm text-slate-500">
        Colors shown are visually estimated from a printed swatch card — confirm against the
        physical Berger ColorBank fandeck before ordering paint.
      </p>
      {categories.map((category) => (
        <section key={category} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{CATEGORY_LABELS[category]}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {bergerYellowsOranges
              .filter((color) => color.category === category)
              .map((color) => (
                <div key={color.code} className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="h-20" style={{ backgroundColor: color.hex }} />
                  <div className="p-2">
                    <p className="text-sm font-medium">{color.name}</p>
                    <p className="text-xs text-slate-500">{color.code}</p>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, visit `/colors`, confirm all 21 swatches render grouped correctly by category.

- [ ] **Step 3: Commit**

```bash
git add src/app/colors/page.tsx
git commit -m "feat: add browsable Colors gallery page"
```

---

### Task 15: Visual identity — design pass across the whole product

**Expanded scope (per explicit owner feedback, 2026-08-27: "i want nice and proper UI"):** this task originally covered only the landing page. Tasks 8-13 were deliberately built with bare-bones functional Tailwind first (to get the upload/wand/recolor mechanics correct and reviewable before investing in visual polish) — that was always meant to be temporary scaffolding, not the finished look. This task now applies one cohesive design system across **every** page: landing, Studio, and Colors — not just the marketing page.

**Files:**
- Modify: `src/app/page.tsx` (landing)
- Modify: `src/app/studio/page.tsx`, `src/components/PhotoUploader.tsx`, `src/components/ColorStudio.tsx`, `src/components/RegionList.tsx`, `src/components/PaletteBrowser.tsx`, `src/components/DownloadButton.tsx` (Studio — restyle only; do not change any of the pixel-processing logic, click handling, or state management these components already have and were already reviewed for)
- Modify: `src/app/colors/page.tsx` (Colors gallery)

**Interfaces:** unchanged — this is a styling pass, not a props/behavior change. Every component keeps the exact props signature it already has.

This task is design-led, not TDD — it produces the customer-facing look of the whole product, so it needs a real aesthetic pass rather than default utility-class scaffolding on every screen.

- [ ] **Step 1: Invoke the frontend-design skill**

Invoke `frontend-design`. Brief it with: the subject is "Color Home," a tool for a paint/hardware business's customers to preview paint colors on photos of their own home before buying; there are three screens to design as one system (landing/marketing, the Studio tool itself, and a browsable Colors gallery) sharing one token system, not three separate looks; the Berger yellows/oranges palette (`docs/colors/berger-yellows-oranges.md`) and the recolor-not-flat-fill technique are real material to ground the design in, not generic paint-brand cliché (no default warm-cream-plus-terracotta template — earn the palette from this specific content). The Studio page is a working tool, not just a hero — its design must keep the upload/canvas/sidebar clearly usable (a click target on the canvas, a legible region list, visible swatches) while still looking intentional, not like an unstyled prototype.

- [ ] **Step 2: Produce and review the design plan**

Follow the skill's brainstorm pass: a compact token system (4-6 named hex values, 2+ typefaces, a layout concept with an ASCII wireframe per screen, and one signature element). Check it against the anti-pattern list in the skill before building.

- [ ] **Step 3: Implement the landing page (`src/app/page.tsx`)**

Build the hero, a short "how it works" section (upload → select → recolor → download), and a clear call-to-action linking to `/studio` (and a secondary link to `/colors`).

- [ ] **Step 4: Apply the same design system to the Studio page and its components**

Restyle `src/app/studio/page.tsx`, `PhotoUploader.tsx`, `ColorStudio.tsx`, `RegionList.tsx`, `PaletteBrowser.tsx`, and `DownloadButton.tsx` using the token system from Step 2 — consistent spacing, typography, color, and the disclaimer copy already present (approximation notice, Berger-estimate caveat). Keep every existing `className`'s functional intent (e.g. `cursor-crosshair` on the canvas, `disabled` states on the palette) — you're changing the visual language, not removing behavior-bearing classes.

- [ ] **Step 5: Apply the same design system to the Colors page**

Restyle `src/app/colors/page.tsx` to match.

- [ ] **Step 6: Screenshot and self-critique all three screens**

Run: `npm run dev`, screenshot the landing page, Studio page (both empty-upload and mid-flow-with-a-photo states if feasible), and Colors page, each at a mobile width (375px) and a desktop width (1440px). Check contrast, spacing, that the CTA is unmistakable, and that the Studio page still clearly reads as an interactive tool.

- [ ] **Step 7: Verify the static build still succeeds and existing tests still pass**

Run: `npm run build`
Run: `npm test` — this is a styling-only change, so all existing unit tests must still pass unmodified; a failure here means a restyle accidentally changed logic, not just appearance.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx src/app/studio/page.tsx src/app/colors/page.tsx src/components/PhotoUploader.tsx src/components/ColorStudio.tsx src/components/RegionList.tsx src/components/PaletteBrowser.tsx src/components/DownloadButton.tsx
git commit -m "feat: apply cohesive visual identity across landing, Studio, and Colors pages"
```

---

### Task 16: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- None (CI configuration only).

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy static build to GitHub Pages"
```

**Note for the implementer:** enabling Pages itself (repo Settings → Pages → Source: GitHub Actions) is a one-time action in the GitHub UI on the actual remote repo — flag it to the user rather than doing it silently, since it touches repo settings outside this codebase.

---

### Task 17: End-to-end test with Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/studio.spec.ts`
- Create: `tests/e2e/fixtures/sample-wall.png` (a small solid-colored test image, generated in Step 1)
- Modify: `package.json` (add `test:e2e` script and `@playwright/test` devDependency)

**Interfaces:**
- Exercises the full app through Tasks 8, 9, 11, 12, 13 as a real browser would — no new production interfaces.

- [ ] **Step 1: Install Playwright and generate a fixture image**

Run: `npm install -D @playwright/test`
Run: `npx playwright install --with-deps chromium`

Generate a simple test fixture (a 400x300 PNG that's mostly one flat color, so flood fill behaves predictably) with a short one-off Node script using the `canvas`-free approach below, saved temporarily and run once:

```ts
// scripts/generate-fixture.mjs (temporary, run once, then delete)
import { writeFileSync } from "node:fs";

// Minimal valid PNG isn't hand-rollable briefly and reliably here — instead,
// use the browser itself to generate the fixture: open about:blank in the
// Playwright test's own setup and draw + export it there. See studio.spec.ts
// Step 2 for the actual approach (no separate fixture file needed).
```

Skip creating a static fixture file — instead, Step 2's test generates its test photo directly in the browser using an in-page `<canvas>`, which avoids committing a binary fixture and avoids needing Node-side PNG encoding.

- [ ] **Step 2: Write `tests/e2e/studio.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("upload, select a region, recolor, and download", async ({ page }) => {
  await page.goto("/studio");

  // Generate a solid-color test photo in-page and hand it to the file input
  // as a real File, via the browser's own canvas/Blob APIs.
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#dddddd";
    ctx.fillRect(0, 0, 200, 150);
    return canvas.toDataURL("image/png");
  });

  const buffer = Buffer.from(dataUrl.split(",")[1], "base64");
  await page.setInputFiles('input[type="file"]', {
    name: "test-wall.png",
    mimeType: "image/png",
    buffer,
  });

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  // Click the middle of the canvas to select the whole (uniformly colored) photo as one region.
  const box = await canvas.boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

  // A region should now appear in the sidebar.
  await expect(page.getByText("Region 1")).toBeVisible();

  // Pick the first Berger swatch.
  await page.locator("main button[title]").first().click();

  // Downloading should trigger a file save.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download result" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("color-home-preview.png");
});
```

- [ ] **Step 3: Write `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
```

- [ ] **Step 4: Add the `test:e2e` script**

Add to `package.json` scripts: `"test:e2e": "playwright test"`

- [ ] **Step 5: Run the test**

Run: `npm run test:e2e`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/e2e/studio.spec.ts package.json package-lock.json
git commit -m "test: add end-to-end coverage for the upload-to-download flow"
```

---

## Self-Review Notes

- **Spec coverage:** landing/Studio/Colors pages (Tasks 13-15), flood fill + lightness-preserving recolor (Tasks 4-5), multi-region support (Task 9's `regions` array), Berger palette + free picker (Tasks 3, 11), download-only output (Task 12), downscaling large photos (Task 6, wired in Task 8), Web Worker with the constraint that pixel math must stay DOM-free (Tasks 2, 4, 5, 7), GitHub Pages deploy (Task 16), unit + E2E testing strategy (Tasks 2-6, 17) — all covered.
- **Type consistency:** `PixelBuffer`/`RGBColor` (Task 2) used identically through Tasks 4, 5, 7, 8, 9. `Region` is defined once in Task 9 and imported by Task 10, with the `recoloredData` field called out explicitly to avoid a Task 9/Task 10 mismatch. Worker message `type` strings (`floodFill`/`floodFillResult`/`recolor`/`recolorResult`) match between Task 7's `worker.ts` and `useCanvasWorker.ts`.
- **No placeholders:** the one deliberately deferred item (a hand-authored PNG fixture in Task 17) was replaced with a concrete in-browser generation approach rather than left as a TODO.
