# Color Home — design spec

Date: 2026-08-26
Status: approved, pending implementation plan

## Problem

A paint/hardware business wants a customer-facing tool: a customer uploads a
photo of their home's interior or exterior, picks a region (a wall, trim,
roof, etc.), assigns it a paint color, and sees a realistic preview before
buying. The result should be downloadable. This is **Color Home** — its own
standalone site, not part of the existing building-care-enterprises codebase,
though it may be linked from there later.

## Constraints

- Must be a fully static site, hosted on GitHub (GitHub Pages). No backend,
  no server, no accounts, no database.
- No photo or project persistence between visits — a customer's photo and
  color choices live only in that browser tab for that session. Downloading
  the result is the only durable output.
- Must work well on a phone, since customers will typically photograph their
  own home directly.

## Non-goals

- No AI/ML wall segmentation. Region selection is user-driven (magic wand).
- No user accounts, saved projects, or history across visits.
- No e-commerce (no cart, checkout, or price display) — this is a visualizer,
  not a store.

## Stack

- **Next.js** (App Router), `output: 'export'` for static export.
- **GitHub Actions** workflow to build and publish to GitHub Pages.
- No state-management or canvas libraries — the core interaction (flood fill
  + hue/saturation recolor) is custom code regardless of library choice, so a
  library would add bundle weight without removing much work. Vitest for unit
  tests of the pure pixel-math functions.

## Pages

1. **Landing page** — hero, "how it works" explanation, link into the Studio.
   Customer-facing, so this gets real visual identity work (see
   frontend-design skill), not a placeholder.
2. **Studio** (`/studio`) — the actual tool: upload/capture a photo, wand-select
   regions, assign colors, download the result.
3. **Colors** (`/colors`) — a browsable gallery of the Berger palette,
   grouped by category (Facade/Trims/Roofs/etc.), usable standalone without
   uploading a photo. Doubles as a lightweight product reference.

## Core interaction (Studio)

1. Customer uploads a photo (file picker or, on mobile, `capture="environment"`
   direct camera capture) or drags one in.
2. Very large photos (phone cameras routinely produce 12MP+) are downscaled to
   a working resolution (target: 1600px on the long edge) before any pixel
   processing, for performance. The download step still exports at this
   working resolution — full original-resolution export is out of scope for
   v1.
3. Customer clicks a point on the photo. A **flood fill** ("magic wand") runs
   from that point with an adjustable tolerance, producing a mask of
   connected, similarly-colored pixels — this becomes a **region**.
4. Customer assigns a color to that region, either from the Berger palette
   browser or a native `<input type="color">` free picker.
5. The region is **recolored**, not flat-filled: the algorithm replaces hue
   and saturation of masked pixels while preserving each pixel's original
   lightness, so shadows, texture, and grain in the original photo survive.
6. Customer repeats steps 3–5 for additional regions (e.g. facade, trim,
   roof) — each region keeps its own mask and color, all composited live over
   the base photo. A region list lets them redo or remove any one region
   without starting over.
7. Customer downloads the flattened result as a PNG.

Flood fill and recolor both run inside a **Web Worker** so pixel-level work
never blocks the UI thread, with a main-thread fallback for browsers lacking
Worker/OffscreenCanvas support (rare, but there's no server to fall back to,
so the fallback must exist).

## Data model

```
src/data/palettes/berger-yellows-oranges.ts
  { name: string, code: string, hex: string, category: "facade" | "trim" | "roof" }[]
```

More palette files (other Berger cards, or other brands) get added the same
way as more reference photos come in. Each file's `hex` values are **sampled
from the photographed swatch card**, since the physical card gives only a
name and a product code, never a hex value — the card itself says shades
shown are indicative only. Sampled hexes carry the same "indicative, confirm
against the real fandeck before tinting" caveat, surfaced in the Colors page
UI, not just buried in a doc.

## Components

| Component | Responsibility |
| --- | --- |
| `PhotoUploader.tsx` | File input + drag-drop + mobile camera capture; downscales and hands off an `ImageBitmap`. |
| `ColorStudio.tsx` | Owns the canvas, click-to-wand interaction, the list of regions, and live compositing. |
| `RegionList.tsx` | Shows each region created so far (swatch + label), lets the customer redo or remove one. |
| `PaletteBrowser.tsx` | Berger swatches grouped by category, plus the free hex/RGB picker. |
| `DownloadButton.tsx` | Flattens all region layers over the base photo into one canvas, exports as PNG. |
| `lib/canvas/floodFill.ts` | Pure function: `ImageData` + seed point + tolerance → mask. |
| `lib/canvas/recolor.ts` | Pure function: `ImageData` + mask + target color → recolored `ImageData`, lightness-preserving. |
| `lib/canvas/worker.ts` | Wraps the two pure functions behind `postMessage`, for off-main-thread execution. |

`floodFill` and `recolor` are plain functions operating on `ImageData`, with
no DOM or canvas dependency — this is what makes them unit-testable without a
browser environment.

## Error handling

- Reject non-image file uploads before any canvas work, with a plain-language
  message.
- Detect degenerate flood-fill results (mask covers almost nothing, or almost
  the entire image) and surface a specific, actionable message ("try a lower
  sensitivity" / "try a flatter part of the wall") rather than silently
  applying a useless mask.
- Environments without Worker/OffscreenCanvas support fall back to running
  the same pure functions synchronously on the main thread, with a visible
  "processing" state during the (slower) computation.

## Testing

- **Unit tests (Vitest)** for `floodFill` and `recolor` against small
  synthetic `ImageData` fixtures (e.g. a 10×10 buffer with a known 5×5 solid
  block) — verifies mask boundaries and recolor math in isolation.
- **E2E**: not part of this spec's initial build — `@playwright/test` can be
  added as a normal dev dependency once the app exists, to cover the
  click-to-wand-to-download flow in a real browser. Deferred to
  implementation, not blocking it.
- **Manual/visual verification**: dev-server screenshots at mobile and
  desktop widths (matching the pattern used on building-care-enterprises),
  plus testing against a real phone photo to judge recolor realism, which
  automated tests can't judge on their own.

## Open items carried into implementation (not blocking this spec)

- Sampling the actual hex values from the photographed Berger swatch card
  (currently only name/code are recorded in `docs/colors/berger-yellows-oranges.md`).
- Visual identity for the landing page (palette, type, layout, signature
  element) — to be developed using the frontend-design skill once
  implementation starts, informed by this spec's constraints but not
  decided here.
- Exact recolor blend algorithm tuning (HSL lightness-preserving is the
  starting point; may need adjustment once tested against real photos).
