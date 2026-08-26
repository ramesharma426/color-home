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

This task has no unit tests: Web Workers require a browser-like environment that Vitest's `node` environment doesn't provide, and the logic being wrapped (`floodFill`, `recolor`) is already covered by Tasks 4-5. Correctness of the worker wiring itself is verified manually in Task 9 (visually, via the running dev server) and by the Task 24 Playwright test, which exercises the whole flow in a real browser.

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

### Task 17: Border mask helper

**Added per explicit owner feedback (2026-08-27):** "wall have borders, so add option to add borders too" — clarified via follow-up question: each region should support an optional border/outline color in addition to its fill color, drawn as a ring around the region's edge (not just relying on selecting the trim as a second region, which the tool already supports).

**Files:**
- Create: `src/lib/canvas/borderMask.ts`
- Test: `src/lib/canvas/borderMask.test.ts`

**Interfaces:**
- Consumes: nothing new (works on a plain `Uint8Array` mask, same shape `floodFill` produces).
- Produces: `computeBorderMask(mask: Uint8Array, width: number, height: number, thickness: number): Uint8Array` — a new mask containing only the pixels within `thickness` layers of the original mask's edge. Consumed by Task 18 (`ColorStudio`).

The algorithm eroding the mask `thickness` times (4-connected: a pixel survives erosion only if it and all four of its neighbors are in the mask) and taking `original AND NOT eroded` as the border ring. Pure, DOM-free, same testing approach as `floodFill`/`recolor`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/canvas/borderMask.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/canvas/borderMask.test.ts`
Expected: FAIL with "Cannot find module './borderMask'"

- [ ] **Step 3: Write `src/lib/canvas/borderMask.ts`**

```ts
function erode(mask: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (!mask[index]) continue;

      const neighbors: Array<[number, number]> = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];

      const allNeighborsInside = neighbors.every(([nx, ny]) => {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;
        return mask[ny * width + nx] === 1;
      });

      result[index] = allNeighborsInside ? 1 : 0;
    }
  }

  return result;
}

export function computeBorderMask(
  mask: Uint8Array,
  width: number,
  height: number,
  thickness: number
): Uint8Array {
  let eroded = mask;
  for (let i = 0; i < thickness; i++) {
    eroded = erode(eroded, width, height);
  }

  const border = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    border[i] = mask[i] && !eroded[i] ? 1 : 0;
  }
  return border;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/canvas/borderMask.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/canvas/borderMask.ts src/lib/canvas/borderMask.test.ts
git commit -m "feat: add border-ring mask helper for optional region outlines"
```

---

### Task 18: Wire border color option into ColorStudio

**Files:**
- Modify: `src/components/ColorStudio.tsx`

**Interfaces:**
- Consumes: `computeBorderMask` (Task 17), `runRecolor` (Task 7, already used for fill), `Region` (extended below).
- Extends `Region` with `borderColor?: RGBColor` and `borderRecoloredData?: Uint8ClampedArray`.

A border is optional per region: a checkbox reveals a native color input; picking a color computes the border ring (via `computeBorderMask` on that region's existing fill mask, main-thread — it's a cheap boolean-array pass, not the expensive per-pixel HSL work `recolor` does) and recolors just that ring through the existing worker `runRecolor` call, exactly like the fill color does for the full mask. `render()`'s compositing loop draws each region's fill first, then its border ring on top, so the border color always wins over the fill color at the edge — matching how a painted trim line sits on top of a wall color in reality.

- [ ] **Step 1: Add the border thickness constant and extend `Region`**

In `src/components/ColorStudio.tsx`, add near `DEFAULT_TOLERANCE`:

```tsx
const BORDER_THICKNESS = 4;
```

Extend the `Region` interface:

```tsx
export interface Region {
  id: string;
  mask: Uint8Array;
  color: RGBColor | null;
  label: string;
  recoloredData?: Uint8ClampedArray;
  borderColor?: RGBColor | null;
  borderRecoloredData?: Uint8ClampedArray;
}
```

- [ ] **Step 2: Add the border import and handler**

```tsx
import { computeBorderMask } from "@/lib/canvas/borderMask";
```

```tsx
async function handleBorderColorSelect(color: RGBColor | null) {
  const baseBuffer = baseBufferRef.current;
  if (!baseBuffer || !activeRegionId) return;

  const region = regions.find((r) => r.id === activeRegionId);
  if (!region) return;

  if (!color) {
    setRegions((prev) =>
      prev.map((r) =>
        r.id === activeRegionId ? { ...r, borderColor: null, borderRecoloredData: undefined } : r
      )
    );
    return;
  }

  const borderMask = computeBorderMask(region.mask, baseBuffer.width, baseBuffer.height, BORDER_THICKNESS);
  const recoloredBuffer = await runRecolor(baseBuffer, borderMask, color);
  setRegions((prev) =>
    prev.map((r) =>
      r.id === activeRegionId ? { ...r, borderColor: color, borderRecoloredData: recoloredBuffer.data } : r
    )
  );
}
```

- [ ] **Step 3: Extend `render()`'s compositing loop to draw borders on top of fills**

Find the existing loop (`for (const region of regions) { ... }` that overlays `region.recoloredData` via `region.mask`) and add a second pass for the border, using the SAME structure but keyed on `region.borderRecoloredData`. The border pass for a given region must run after that region's own fill pass (so the border wins at the edge), but region-to-region order stays the same as before (each region's own fill+border pair, in `regions` array order):

```tsx
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

      if (!region.borderRecoloredData) continue;
      const borderMask = computeBorderMask(region.mask, baseBuffer.width, baseBuffer.height, BORDER_THICKNESS);
      for (let pixelIndex = 0; pixelIndex < borderMask.length; pixelIndex++) {
        if (!borderMask[pixelIndex]) continue;
        const offset = pixelIndex * 4;
        composed[offset] = region.borderRecoloredData[offset];
        composed[offset + 1] = region.borderRecoloredData[offset + 1];
        composed[offset + 2] = region.borderRecoloredData[offset + 2];
        composed[offset + 3] = region.borderRecoloredData[offset + 3];
      }
    }
```

**Note for the implementer:** `computeBorderMask` is recomputed here in `render()` rather than cached on the region — it's a cheap boolean pass (no HSL math), so recomputing it at render time keeps the `Region` type smaller and avoids a second piece of derived state to keep in sync. Do not "optimize" this into a stored field as part of this task; if profiling ever shows it matters, that's a separate, deliberate change.

- [ ] **Step 4: Add the border UI control to the sidebar**

In the JSX where `PaletteBrowser` is rendered, add a border control directly below it, styled consistently with the rest of the Task 15 design system already in this file (use the same `graphite`/`chalk`/`sun` tokens and spacing conventions already present in this file — do not reach for different colors or a different visual language for this one control):

```tsx
{activeRegionId && (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-sm text-graphite/70">
      <input
        type="checkbox"
        checked={Boolean(regions.find((r) => r.id === activeRegionId)?.borderColor)}
        onChange={(event) => {
          if (!event.target.checked) {
            handleBorderColorSelect(null);
          }
        }}
      />
      Add a border
    </label>
    {regions.find((r) => r.id === activeRegionId)?.borderColor && (
      <input
        type="color"
        onChange={(event) => {
          const hex = event.target.value;
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          handleBorderColorSelect({ r, g, b });
        }}
        className="h-8 w-12"
      />
    )}
  </div>
)}
```

Checking the box with no color chosen yet should call `handleBorderColorSelect` with a sensible default (e.g. pure white `{r:255,g:255,b:255}`) so the color input immediately appears with a border already applied — wire this into the checkbox's `onChange` for the `checked` (true) branch, following the same pattern as the `false` branch above (call `handleBorderColorSelect({ r: 255, g: 255, b: 255 })` when checked becomes true).

- [ ] **Step 5: Manual verification**

With the dev server running (do NOT run `npm run build` while it's up — see this project's established caution about `.next` cache collisions), upload a photo, select a region, add a border via the checkbox, confirm a border ring appears drawn on top of the fill color at the region's edge. Change the fill color afterward and confirm the border stays on top rather than being covered by the new fill.

- [ ] **Step 6: Commit**

```bash
git add src/components/ColorStudio.tsx
git commit -m "feat: add optional border/outline color per region"
```

---

### Task 19: Drag-and-drop a swatch directly onto a region

**Added per explicit owner feedback (2026-08-27):** "color can also be dragged and dropped in region directly" — an alternative, faster interaction alongside the existing click-then-pick-color flow: drag a Berger swatch from the palette browser and drop it on a spot in the photo; that spot gets flood-filled and recolored in one motion, no separate "select region, then pick its color" round-trip.

**Files:**
- Modify: `src/components/PaletteBrowser.tsx` (make swatch buttons draggable)
- Modify: `src/components/ColorStudio.tsx` (make the canvas a drop target)

**Interfaces:**
- No new exported functions — reuses `runFloodFill`/`runRecolor` (Task 7) exactly as `handleCanvasClick`/`handleColorSelect` already do. Drag payload is a JSON-encoded `RGBColor` under the `application/x-color-rgb` MIME type.

This is additive: the existing click-to-select-then-pick-color flow in `ColorStudio.tsx` is untouched. Dropping a color is a new, separate path that performs both steps (flood fill + recolor) in one handler.

- [ ] **Step 1: Make Berger swatch buttons draggable in `PaletteBrowser.tsx`**

Find the swatch `<button>` inside the category loop (the one with `style={{ backgroundColor: color.hex }}`) and add:

```tsx
draggable
onDragStart={(event) => {
  event.dataTransfer.setData("application/x-color-rgb", JSON.stringify(hexToRgb(color.hex)));
  event.dataTransfer.effectAllowed = "copy";
}}
```

The native free-color `<input type="color">` is left as click-only — browsers don't support dragging a color out of that control in a way worth building around; this feature covers the Berger swatches, which is the primary case.

- [ ] **Step 2: Add a drop handler to the canvas in `ColorStudio.tsx`**

Add near `handleCanvasClick`:

```tsx
async function handleCanvasDrop(event: React.DragEvent<HTMLCanvasElement>) {
  event.preventDefault();
  const canvas = canvasRef.current;
  const baseBuffer = baseBufferRef.current;
  if (!canvas || !baseBuffer) return;

  const raw = event.dataTransfer.getData("application/x-color-rgb");
  if (!raw) return;

  let color: RGBColor;
  try {
    color = JSON.parse(raw);
  } catch {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.round((event.clientX - rect.left) * scaleX);
  const y = Math.round((event.clientY - rect.top) * scaleY);

  const mask = await runFloodFill(baseBuffer, x, y, tolerance);
  const recoloredBuffer = await runRecolor(baseBuffer, mask, color);
  const id = crypto.randomUUID();
  setRegions((prev) => [
    ...prev,
    { id, mask, color, label: `Region ${prev.length + 1}`, recoloredData: recoloredBuffer.data },
  ]);
  setActiveRegionId(id);
}
```

Wire it onto the `<canvas>` element, alongside the existing `onClick={handleCanvasClick}`:

```tsx
onDragOver={(event) => event.preventDefault()}
onDrop={handleCanvasDrop}
```

(`onDragOver` must call `preventDefault()` — same rule as the existing `PhotoUploader` drag-and-drop — or the browser will refuse to fire `onDrop` at all.)

- [ ] **Step 3: Manual verification**

With the dev server running (do NOT run `npm run build` while it's up), upload a photo, drag a Berger swatch from the sidebar onto a wall area in the photo, confirm it flood-fills and recolors that spot in one motion and appears in the region list with the dropped color already set. Confirm the existing click-then-pick flow still works unchanged afterward.

- [ ] **Step 4: Commit**

```bash
git add src/components/PaletteBrowser.tsx src/components/ColorStudio.tsx
git commit -m "feat: support dragging a swatch directly onto a region"
```

---

### Task 20: Dictionary infrastructure — extract all UI strings to English

**Added per explicit owner feedback (2026-08-27):** "i also want nepali language switcher" — clarified via follow-up question: same pattern as the owner's other project (building-care-enterprises), which renders every page twice (English at `/`, Nepali at `/ne/...`) via separate dictionaries and a `getDictionary(locale)` lookup, not a client-side text-swap. This task is the first half: extract every hardcoded English string in the app into a typed dictionary, with zero visible change to the English site — a pure refactor, verified by the existing test suite and byte-for-byte content checks. Task 21 adds the actual Nepali translations and the `/ne` routes on top of this.

**Files:**
- Create: `src/dictionaries/types.ts`
- Create: `src/dictionaries/en.ts`
- Create: `src/lib/dictionary.ts`
- Modify: `src/app/page.tsx`, `src/app/studio/page.tsx`, `src/app/colors/page.tsx`
- Modify: `src/components/SiteNav.tsx`, `src/components/PhotoUploader.tsx`, `src/components/ColorStudio.tsx`, `src/components/RegionList.tsx`, `src/components/PaletteBrowser.tsx`, `src/components/DownloadButton.tsx`

**Interfaces:**
- Produces: `type Locale = "en" | "ne"`; a `Dictionary` interface covering every user-facing string in the app; `getDictionary(locale: Locale): Dictionary`. Consumed by every page/component listed above, and by Task 21's Nepali routes.

This task does NOT create any Nepali content or routes — `ne.ts` doesn't exist yet. The only behavior change allowed is *how* strings reach the DOM (dictionary lookup instead of a literal in JSX); the *rendered English text must be identical* to what's live today.

- [ ] **Step 1: Inventory every current user-facing string**

Read the current content of `src/app/page.tsx`, `src/app/studio/page.tsx`, `src/app/colors/page.tsx`, and every file under `src/components/` (`SiteNav.tsx`, `PhotoUploader.tsx`, `ColorStudio.tsx`, `RegionList.tsx`, `PaletteBrowser.tsx`, `DownloadButton.tsx`). List every literal string a visitor would read: headings, body copy, button labels, placeholder/empty-state text, error messages, the two disclaimers (Studio's "screens vs paint" explanation, the Berger-estimate caveat), aria-labels/titles that carry real words (not decorative). This inventory becomes the dictionary's key list — do not skip anything, including short strings like button labels or a checkbox's label text.

- [ ] **Step 2: Design and write `src/dictionaries/types.ts`**

Group keys by the page/component they belong to, following this shape (extend it with whatever additional keys your inventory from Step 1 turns up — this is a minimum, not an exact final list):

```ts
export type Locale = "en" | "ne";

export interface Dictionary {
  nav: {
    studioLink: string;
    colorsLink: string;
    switchLanguageLabel: string; // e.g. the text/label for the language switcher link itself
  };
  landing: {
    // one key per distinct heading/paragraph/button on the current landing page —
    // name them for what they are (heroTitle, heroSubtitle, ctaPrimary, ctaSecondary,
    // stepOneTitle, stepOneBody, ... etc.), matching your Step 1 inventory exactly.
    [key: string]: string;
  };
  studio: {
    pageTitle: string;
    disclaimer: string; // the full "screens vs paint" paragraph, verbatim
    uploaderDragText: string;
    uploaderButtonText: string;
    uploaderErrorNotImage: string;
    uploaderErrorDecodeFailed: string;
    sensitivityLabel: string;
    regionsEmptyState: string;
    borderCheckboxLabel: string;
    downloadButtonLabel: string;
    // add any further keys your inventory finds in ColorStudio.tsx/RegionList.tsx/PaletteBrowser.tsx
    [key: string]: string;
  };
  colors: {
    pageTitle: string;
    caveat: string;
    categoryFacade: string;
    categoryTrim: string;
    categoryRoof: string;
  };
}
```

(The `[key: string]: string` index signatures are a scaffold for this step only — by Step 3 every key actually used should be explicitly named in the interface, not left as an untyped catch-all. Remove the index signatures once the real key list is final, so TypeScript actually catches a missing key in `ne.ts` later in Task 21.)

- [ ] **Step 3: Write `src/dictionaries/en.ts`**

```ts
import type { Dictionary } from "./types";

export const en: Dictionary = {
  // populated key-by-key from your Step 1 inventory — every value here must be
  // the EXACT current text from the live components/pages, verbatim, not a
  // paraphrase.
};
```

- [ ] **Step 4: Write `src/lib/dictionary.ts`**

```ts
import { en } from "@/dictionaries/en";
import type { Dictionary, Locale } from "@/dictionaries/types";

const dictionaries: Partial<Record<Locale, Dictionary>> = { en };

export function getDictionary(locale: Locale): Dictionary {
  const dict = dictionaries[locale];
  if (!dict) {
    throw new Error(`No dictionary registered for locale "${locale}"`);
  }
  return dict;
}
```

(`Partial<Record<...>>` and the runtime check are deliberate — `ne` doesn't exist until Task 21, and this must not silently pretend it does.)

- [ ] **Step 5: Wire every page and component to read from the dictionary**

For each file in the Files list, replace every literal string identified in Step 1 with a lookup into a `dict: Dictionary` value. Concrete worked example — before:

```tsx
// src/components/DownloadButton.tsx (before)
export function DownloadButton({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  // ...
  return (
    <button type="button" onClick={handleDownload} className="...">
      Download result
    </button>
  );
}
```

after:

```tsx
// src/components/DownloadButton.tsx (after)
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/dictionaries/types";

export function DownloadButton({
  canvasRef,
  locale,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  // ...
  return (
    <button type="button" onClick={handleDownload} className="...">
      {dict.studio.downloadButtonLabel}
    </button>
  );
}
```

Every component in the Files list gains a `locale: Locale` prop the same way (components that are rendered by `ColorStudio` — `RegionList`, `PaletteBrowser`, `DownloadButton` — receive it as a prop from `ColorStudio`, which itself receives it from the Studio page). Pages (`src/app/page.tsx`, `src/app/studio/page.tsx`, `src/app/colors/page.tsx`) call `getDictionary("en")` directly for now (hardcoded — Task 21 makes this locale-driven by the route).

**Do not change any Tailwind classes, layout, or component logic in this task** — this is a strings-only refactor. If you find yourself wanting to touch anything else, stop and note it in your report instead.

- [ ] **Step 6: Verify zero visible change**

Run: `npm test` — must still be the same pass count as before this task (26 tests as of Task 18), unmodified.
Run: `npx tsc --noEmit` — no errors.
With the dev server running (do NOT run `npm run build`), `curl` all three routes (`/`, `/studio`, `/colors`) before and after your changes are live and diff the extracted visible text — it must be identical. The fastest way: `curl -s http://localhost:3000/ | grep -oE '>[^<]+<' | grep -v '^><$'` (rough text-node extraction) before starting Step 5 and again after, and confirm the two outputs match aside from any Next.js build-id/hash noise.

- [ ] **Step 7: Commit**

```bash
git add src/dictionaries/ src/lib/dictionary.ts src/app/page.tsx src/app/studio/page.tsx src/app/colors/page.tsx src/components/SiteNav.tsx src/components/PhotoUploader.tsx src/components/ColorStudio.tsx src/components/RegionList.tsx src/components/PaletteBrowser.tsx src/components/DownloadButton.tsx
git commit -m "refactor: extract all UI strings into an English dictionary"
```

---

### Task 21: Nepali translations, /ne routes, and the language switcher

**Files:**
- Create: `src/dictionaries/ne.ts`
- Create: `src/lib/paths.ts`
- Create: `src/app/ne/layout.tsx`, `src/app/ne/page.tsx`, `src/app/ne/studio/page.tsx`, `src/app/ne/colors/page.tsx`
- Modify: `src/components/SiteNav.tsx` (add the working switcher link)

**Interfaces:**
- Consumes: `Dictionary`/`Locale`/`getDictionary` (Task 20).
- Produces: `localeHref(locale: Locale, path: string): string` — e.g. `localeHref("ne", "/studio")` → `/ne/studio`, `localeHref("en", "/studio")` → `/studio`.

**Translation content:** the controller will supply the exact Nepali text for every key in `en.ts` once Task 20's dictionary exists and its final key list is known — this cannot be written into the plan in advance since Task 20's Step 1 inventory determines the exact keys. Translation conventions to follow (matching the owner's other bilingual project, `building-care-enterprises`): the brand name "Color Home" stays untranslated in Nepali text; Berger color names (e.g. "Long Beach", "Signal Red") stay untranslated/unchanged, since they're product names printed on the physical swatch card; product codes (e.g. "2T 0669") are never translated or reformatted.

- [ ] **Step 1: Write `src/lib/paths.ts`**

```ts
import type { Locale } from "@/dictionaries/types";

export function localeHref(locale: Locale, path: string): string {
  return locale === "ne" ? `/ne${path}` : path;
}
```

- [ ] **Step 2: Write `src/dictionaries/ne.ts`**

Using the exact key list from `src/dictionaries/en.ts` (Task 20) and the Nepali text the controller provides (see the task dispatch for the actual strings — do not invent translations yourself if exact text was provided; only translate a key yourself if the dispatch explicitly says a key was missed and asks you to). TypeScript's `Dictionary` interface will fail to compile if any key is missing — that's the mechanism that guarantees full coverage, so if `npx tsc --noEmit` is clean, every key exists.

```ts
import type { Dictionary } from "./types";

export const ne: Dictionary = {
  // every key from en.ts, translated
};
```

Register it in `src/lib/dictionary.ts`:

```ts
import { ne } from "@/dictionaries/ne";
// ...
const dictionaries: Partial<Record<Locale, Dictionary>> = { en, ne };
```

- [ ] **Step 3: Create the Nepali layout**

```tsx
// src/app/ne/layout.tsx
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Color Home",
  description: "आफ्नो घरको फोटोमा नै पेन्टको रङ हेर्नुहोस्, किन्नुअघि।",
};

export default function NepaliLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ne">
      <body className="bg-chalk text-graphite antialiased">{children}</body>
    </html>
  );
}
```

(Match whatever body classes/font setup Task 15 actually left in the root `src/app/layout.tsx` — copy them here rather than the placeholder shown, since Task 15 landed after this plan text was written and this file must stay visually identical to the English layout, just with `lang="ne"`.)

- [ ] **Step 4: Create the three Nepali pages as thin locale wrappers**

Each Nepali page renders exactly the same JSX tree as its English counterpart, with `getDictionary("ne")` instead of `getDictionary("en")` and `locale="ne"` passed down to every component that needs it. Concrete pattern for `src/app/ne/studio/page.tsx` (mirror this same pattern for `src/app/ne/page.tsx` and `src/app/ne/colors/page.tsx` against their English counterparts):

```tsx
"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { ColorStudio } from "@/components/ColorStudio";
import { getDictionary } from "@/lib/dictionary";

export default function NepaliStudioPage() {
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  const dict = getDictionary("ne");

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">{dict.studio.pageTitle}</h1>
      <p className="mb-6 text-sm text-graphite/70">{dict.studio.disclaimer}</p>
      {photo ? (
        <ColorStudio photo={photo} locale="ne" />
      ) : (
        <PhotoUploader onPhotoReady={setPhoto} locale="ne" />
      )}
    </main>
  );
}
```

Adjust the exact JSX structure/classNames to match whatever Task 15 and Task 18 actually left in `src/app/studio/page.tsx` at the time you do this work — read that file first and mirror its real current structure, not the illustrative sketch above.

- [ ] **Step 5: Add the working language switcher to `SiteNav.tsx`**

The switcher must link to the *equivalent* page in the other language, not always back to the homepage — e.g. from `/studio` it links to `/ne/studio`, from `/ne/colors` it links to `/colors`. Use `usePathname()` (Next.js client hook) to get the current path, strip a leading `/ne` if present to get the "base path," then build both hrefs with `localeHref`:

```tsx
"use client";
import { usePathname } from "next/navigation";
import { localeHref } from "@/lib/paths";
import type { Locale } from "@/dictionaries/types";

// inside SiteNav, given the component already receives `locale: Locale`:
const pathname = usePathname();
const basePath = pathname.startsWith("/ne") ? pathname.slice(3) || "/" : pathname;
const otherLocale: Locale = locale === "en" ? "ne" : "en";
const switchHref = localeHref(otherLocale, basePath);
// render: <Link href={switchHref}>{dict.nav.switchLanguageLabel}</Link>
```

- [ ] **Step 6: Manual verification**

With the dev server running, `curl http://localhost:3000/ne`, `/ne/studio`, `/ne/colors` — confirm 200 and Nepali text present (not English). Confirm `/`, `/studio`, `/colors` are completely unchanged from before this task (still English, same content as Task 20 left them). Trace the switcher logic by hand for at least the `/studio` ↔ `/ne/studio` case.

- [ ] **Step 7: Verify the static build succeeds with the new routes**

Stop first if a dev server is running in this checkout (do not run `npm run build` alongside it — see this project's established `.next`-collision caution); if you can't safely stop it yourself, skip this step and say so in your report rather than risking the collision — the controller will run this check separately.

- [ ] **Step 8: Commit**

```bash
git add src/dictionaries/ne.ts src/lib/dictionary.ts src/lib/paths.ts src/app/ne/ src/components/SiteNav.tsx
git commit -m "feat: add Nepali translations, /ne routes, and language switcher"
```

---

### Task 22: Catalogue data validation tests

**Added per explicit owner feedback (2026-08-27):** two follow-up requests — a link to Asian Paints' public shade card ("here are all the colors with name, i want same in app, user can search for colors") and a link to Berger's official colour catalogue ("have section where we can select asian and berger separately"). The controller fetched both public sources directly, extracted every colour (name, product code, and REAL published hex value — not estimated, unlike the original hand-photographed `berger-yellows-oranges.ts` data), and committed the results as `src/data/palettes/berger-catalogue.ts` (1,575 colours) and `src/data/palettes/asian-paints-catalogue.ts` (1,828 colours) directly, since a fresh implementer subagent has no way to independently verify a real color against a live website and generating ~3,400 entries by hand invites transcription error at that scale. This task adds the validation tests those data files still need — it does not touch the data itself.

**Files:**
- Test: `src/data/palettes/berger-catalogue.test.ts`
- Test: `src/data/palettes/asian-paints-catalogue.test.ts`

**Interfaces:**
- Consumes: `bergerCatalogue`, `bergerCategories` (from `src/data/palettes/berger-catalogue.ts`), `asianPaintsCatalogue`, `asianPaintsCategories` (from `src/data/palettes/asian-paints-catalogue.ts`), `CatalogueColor` (`src/data/palettes/types.ts`) — all already committed, nothing new to produce.

- [ ] **Step 1: Write `src/data/palettes/berger-catalogue.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { bergerCatalogue, bergerCategories } from "./berger-catalogue";

describe("bergerCatalogue", () => {
  it("has 1575 entries", () => {
    expect(bergerCatalogue).toHaveLength(1575);
  });

  it("every entry has a valid 6-digit hex color", () => {
    for (const color of bergerCatalogue) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("every entry's category is one of the declared categories", () => {
    for (const color of bergerCatalogue) {
      expect(bergerCategories).toContain(color.category);
    }
  });

  it("has no exact duplicate name+code pairs", () => {
    const keys = bergerCatalogue.map((c) => `${c.name}|${c.code}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every entry has a non-empty name and code", () => {
    for (const color of bergerCatalogue) {
      expect(color.name.length).toBeGreaterThan(0);
      expect(color.code.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the test, confirm it passes (the data already exists — this is verifying committed data, not driving new implementation, so there is no "red" step here)**

Run: `npx vitest run src/data/palettes/berger-catalogue.test.ts`
Expected: PASS (5 tests). If anything fails, that's a real data defect in the committed catalogue — report it rather than adjusting the test to match bad data.

- [ ] **Step 3: Write `src/data/palettes/asian-paints-catalogue.test.ts`** — identical structure to Step 1, against `asianPaintsCatalogue`/`asianPaintsCategories`, with the expected count `1828` instead of `1575`.

- [ ] **Step 4: Run and confirm**

Run: `npx vitest run src/data/palettes/asian-paints-catalogue.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/data/palettes/berger-catalogue.test.ts src/data/palettes/asian-paints-catalogue.test.ts
git commit -m "test: validate Berger and Asian Paints catalogue data"
```

---

### Task 23: Redesign the Colors page — brand selection and search

**Added per explicit owner feedback (2026-08-27):** "be creative and make the section more user friendly because here are lots of colors" — with ~3,400 colors across two brands now available (Task 22), the existing Colors page (a flat list of 21 swatches under 3 headings) doesn't scale. This task replaces it with a brand-switchable, searchable browser.

**Files:**
- Modify: `src/app/colors/page.tsx`
- Create: `src/components/CatalogueBrowser.tsx`

**Interfaces:**
- Consumes: `bergerCatalogue`/`bergerCategories`, `asianPaintsCatalogue`/`asianPaintsCategories` (Task 22's data), `CatalogueColor` (Task 22's types).
- The original `bergerYellowsOranges` (facade/trim/roof) data and its use inside `PaletteBrowser.tsx`/the Studio tool are UNCHANGED by this task — this is additive, a new way to browse colors on the standalone `/colors` page, not a replacement for how colors are picked inside the Studio tool.

**Design constraints (this is a design-led task, following Task 15's established visual system — reuse its tokens, don't introduce a new visual language):**

- At ~1,500-1,800 colors per brand, do not render the full unfiltered list by default — that's the "more user friendly" problem this task exists to solve. Default state (no search, no category picked): show the brand's category list as clickable chips/cards with nothing else, prompting the visitor to either search or pick a category, rather than dumping every color on load.
- A search input filters by name OR code, case-insensitive substring match, across ALL categories of the currently selected brand (not just the selected category) — so typing "red" finds every color with "red" in its name regardless of which hue-family it's filed under.
- Picking a category (when not searching) shows every color in that category as a grid of swatches, each showing its name and code (same visual pattern as the existing Colors page — small swatch block, name below, code below that).
- A brand toggle (Berger / Asian Paints) switches the whole browser's data source and resets category/search selection.
- Keep the existing estimated-hex caveat visible for whichever data actually needs it: `bergerYellowsOranges` doesn't appear on this redesigned page at all anymore (Task 22's Berger data has real published hex, no caveat needed for it); neither Berger nor Asian Paints catalogue data needs the "visually estimated" caveat since both are real published hex values — but note plainly, once, that swatch rendering depends on the visitor's screen/browser and can still look different from an in-store sample (reuse language consistent with the Studio disclaimer's spirit, don't just delete all caveats because the hex happens to be real this time).

- [ ] **Step 1: Write `src/components/CatalogueBrowser.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import type { CatalogueColor, PaintBrand } from "@/data/palettes/types";
import { bergerCatalogue, bergerCategories } from "@/data/palettes/berger-catalogue";
import { asianPaintsCatalogue, asianPaintsCategories } from "@/data/palettes/asian-paints-catalogue";

const BRANDS: { id: PaintBrand; label: string; colors: CatalogueColor[]; categories: string[] }[] = [
  { id: "berger", label: "Berger", colors: bergerCatalogue, categories: bergerCategories },
  { id: "asian-paints", label: "Asian Paints", colors: asianPaintsCatalogue, categories: asianPaintsCategories },
];

export function CatalogueBrowser() {
  const [brandId, setBrandId] = useState<PaintBrand>("berger");
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const brand = BRANDS.find((b) => b.id === brandId)!;

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query) {
      return brand.colors.filter(
        (c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
      );
    }
    if (category) {
      return brand.colors.filter((c) => c.category === category);
    }
    return [];
  }, [brand, category, search]);

  function handleBrandChange(next: PaintBrand) {
    setBrandId(next);
    setCategory(null);
    setSearch("");
  }

  return (
    <div>
      <div role="tablist" aria-label="Paint brand" className="mb-6 flex gap-2">
        {BRANDS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={b.id === brandId}
            onClick={() => handleBrandChange(b.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              b.id === brandId ? "border-graphite bg-graphite text-chalk" : "border-hairline-strong text-graphite/70"
            }`}
          >
            {b.label} <span className="text-xs opacity-70">({b.colors.length})</span>
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setCategory(null);
        }}
        placeholder={`Search ${brand.label} colors by name or code…`}
        className="mb-6 w-full rounded-lg border border-hairline-strong px-4 py-2 text-sm"
      />

      {!search && (
        <div className="mb-6 flex flex-wrap gap-2">
          {brand.categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat === category ? null : cat)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                cat === category ? "border-graphite bg-graphite text-chalk" : "border-hairline-strong text-graphite/70"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {results.length === 0 ? (
        <p className="text-sm text-graphite/60">
          {search || category
            ? "No colors matched. Try a different name, code, or family."
            : "Search by name or code, or pick a shade family above, to browse."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {results.map((color) => (
            <div key={`${color.name}-${color.code}`} className="overflow-hidden rounded-lg border border-hairline-strong">
              <div className="h-16" style={{ backgroundColor: color.hex }} />
              <div className="p-2">
                <p className="truncate text-sm font-medium">{color.name}</p>
                <p className="label-mono text-graphite/70">{color.code}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-graphite/60">
        Swatches are rendered from each brand's published colour values, but how they look still depends on
        your screen — confirm against a physical fandeck or sample pot before painting.
      </p>
    </div>
  );
}
```

Adjust class names to match whatever Task 15 actually left as the established tokens (`graphite`, `chalk`, `hairline-strong`, `label-mono`, etc.) — read `tailwind.config.ts` and a sibling file like `PaletteBrowser.tsx` first to confirm exact token names before using them; the snippet above uses the names introduced in Task 15's report but verify against the real file.

- [ ] **Step 2: Rewrite `src/app/colors/page.tsx` to use it**

Replace the existing flat Berger-yellows-oranges listing with:

```tsx
import { CatalogueBrowser } from "@/components/CatalogueBrowser";

export default function ColorsPage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">Browse Colors</h1>
      <p className="mb-6 text-sm text-graphite/70">
        Explore the full Berger and Asian Paints catalogues — search by name or code, or browse by shade family.
      </p>
      <CatalogueBrowser />
    </main>
  );
}
```

Match this page's heading/intro styling to whatever Task 15 actually left here — read the current file first.

- [ ] **Step 3: Manual verification**

With the dev server running (do NOT run `npm run build`), `curl http://localhost:3000/colors` — confirm 200 and the brand toggle / search input / category chips are present in the markup. Since search/category state is client-side, a plain curl only shows the initial (empty) state — that's correct per this task's own design constraint (nothing renders until the visitor searches or picks a category).

- [ ] **Step 4: Verify no regressions**

Run: `npx tsc --noEmit`
Run: `npm test` — must stay at the same pass count as before this task; this task does not touch `PaletteBrowser.tsx`, `ColorStudio.tsx`, or `berger-yellows-oranges.ts`, so nothing here should change existing test results.

- [ ] **Step 5: Commit**

```bash
git add src/app/colors/page.tsx src/components/CatalogueBrowser.tsx
git commit -m "feat: redesign Colors page with brand selection and search"
```

---

### Task 24: End-to-end test with Playwright

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
- **No placeholders:** the one deliberately deferred item (a hand-authored PNG fixture in Task 24) was replaced with a concrete in-browser generation approach rather than left as a TODO.
- **Post-launch additions (2026-08-27):** Tasks 17-23 (border mask helper, border UI wiring, drag-and-drop swatch-to-region, dictionary extraction, Nepali translations + /ne routes + switcher, catalogue data validation, redesigned searchable Colors page) were added after Tasks 1-16 were already implemented and reviewed, per explicit owner feedback during that work. They follow the same file-structure and task-right-sizing conventions as the original plan and were inserted before the Playwright task (now Task 24) so the e2e coverage lands after the full feature set exists. Task 21's Nepali translation content is intentionally not pre-written into the plan text — it depends on Task 20's exact key inventory, which didn't exist when this plan section was authored — the controller supplies the actual Nepali strings at Task 21's dispatch time. Task 22's two catalogue data files (1,575 Berger + 1,828 Asian Paints colors, real published hex values) were authored directly by the controller from public source pages rather than by an implementer subagent, since verifying ~3,400 real-world color values against live external websites isn't something a sandboxed implementer can do independently — Task 22 itself only adds the validation tests for that already-committed data.
