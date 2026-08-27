# Selection toolbar (Phase 1) — design spec

Date: 2026-08-27
Status: approved, pending implementation plan

## Problem

The Studio currently offers exactly one way to select a surface: Magic Wand
(click a spot, flood-fill outward by adaptive tolerance). The owner wants a
real Photoshop-style toolbar with multiple selection tools, so a customer can
pick whichever selection method suits the surface they're trying to isolate —
a freeform lasso for an irregular patch, a polygonal lasso for a
straight-edged trim board, a brush for manual touch-up — plus an authentic
animated dashed "marching ants" border on the active selection instead of the
current solid highlight outline.

## Scope: Phase 1 of a larger request

The owner's original ask also included Quick Selection (brush that grows by
color/texture similarity), Magnetic Lasso (edge-snapping drag), and Object
Selection (auto-detect a whole object). Those are explicitly deferred:

- **Quick Selection** and **Magnetic Lasso** are feasible client-side without
  ML (Magnetic Lasso is classic gradient/edge-magnitude + shortest-path
  "live wire" in real Photoshop, not a neural model) but are real algorithm
  work, planned as later phases.
- **Object Selection** is backed by a trained segmentation model in real
  Photoshop; a static, no-backend, no-ML-model app has no honest equivalent.
  This is parked for a separate discussion, not silently scoped down or
  approximated here.

This spec covers only: **Lasso, Polygonal Lasso, Selection Brush, a Hand
tool, the toolbar UI itself, and the marching-ants selection border.** Magic
Wand already exists and is unchanged in behavior, just relocated into the new
toolbar.

## Non-goals (this phase)

- Quick Selection, Magnetic Lasso, Object Selection (see Scope above).
- Keyboard shortcuts (Photoshop's W/L bindings) — deliberately cut to avoid
  focus-guarding complexity for a nice-to-have; easy follow-on later.
- Any change to the Region/mask data model, RegionList, PaletteBrowser,
  border-color feature, or DownloadButton — all stay untouched.

## Architecture

A new `activeTool` state — `'magicWand' | 'lasso' | 'polygonLasso' | 'brush'
| 'hand'` — becomes the single source of truth for what canvas interaction is
currently live. It's held in `ColorStudio.tsx` (already the project's
established home for all cross-cutting Studio state) and drives:

- A new `SelectionToolbar.tsx` component: a vertical icon strip positioned
  beside the canvas, one button per tool, active tool visually highlighted,
  `onSelect(tool)` callback up to `ColorStudio`.
- Contextual controls that swap with the active tool: the existing
  sensitivity slider shows only for Magic Wand (unchanged); a new brush-size
  slider shows only for Selection Brush.
- Canvas pointer-event dispatch branches on `activeTool`. Magic Wand's
  existing click / Ctrl-click-merge / right-click logic is untouched, just
  gated behind `activeTool === 'magicWand'`.

### Pan is revised, not removed

Task 31's pan currently triggers on *any* drag on the canvas, disambiguated
from a click only by a 4px-movement threshold plus a `suppressNextClickRef`
guard. That heuristic directly conflicts with Lasso and Selection Brush,
which are themselves legitimate drag gestures.

Fix: panning becomes explicit, matching real Photoshop. It triggers only
when (a) `activeTool === 'hand'` and the wrapper receives a pointer-drag, or
(b) the Spacebar is held down (tracked via a window-level keydown/keyup
listener while the Studio is mounted), regardless of the active tool. The
old movement-threshold and `suppressNextClickRef` heuristics are deleted
entirely — with explicit pan triggers, a plain drag on the canvas is always
unambiguously "draw with the active tool."

Spacebar-pan must not fire while a text input has focus (e.g. the catalog
search box) — guarded by checking `document.activeElement`'s tag name in the
keydown handler.

## New algorithms

Three new, self-contained modules under `src/lib/canvas/`, matching the
existing style of `floodFill.ts` / `borderMask.ts` / `recolor.ts` (pure
functions, DOM-free, unit-testable):

- **`polygonMask.ts`** — `polygonToMask(points, width, height): Uint8Array`.
  Scanline point-in-polygon rasterization. Shared by both Lasso and
  Polygonal Lasso:
  - **Lasso**: pointerdown starts capture, pointermove appends points (drawn
    live as a preview path on the overlay canvas), pointerup closes the path
    back to its start and rasterizes it.
  - **Polygonal Lasso**: click appends a vertex with a live rubber-band line
    to the cursor; the polygon closes when a click lands near the start
    point or on double-click; Escape cancels the in-progress polygon.
- **`brushMask.ts`** — `paintBrushStroke(mask, width, height, pathPoints,
  radius): Uint8Array`. Unions filled circles along a pointer path,
  interpolating between points so a fast drag doesn't leave gaps. Selection
  Brush: pointerdown/move paints, pointerup commits, radius comes from the
  new brush-size slider.
- **Contour tracing for the marching-ants visual** — purely cosmetic, never
  used for recoloring. **Revised after this spec's initial approval:**
  research done while writing the implementation plan found that a
  hand-rolled single-component boundary tracer (as originally planned here)
  would silently fail to outline a region made of multiple disconnected
  mask patches — a real, already-shipped case, since a Ctrl+click merge can
  span several disconnected patches in one region. `d3-contour` (ISC
  license, one dependency — `d3-array`, also ISC) is adopted instead: it's
  a mature, widely-used library built for exactly this scalar-field-to-polygon
  problem and correctly handles multiple disconnected regions and holes.
  This is the project's first external runtime dependency, and a
  deliberate, narrow exception to this project's "no canvas libraries"
  stance — it touches only this cosmetic outline, never flood fill, recolor,
  or any other pixel math. The overlay canvas effect strokes the returned
  polygon(s) with `ctx.setLineDash([4, 4])` and an incrementing
  `lineDashOffset`, animated via `requestAnimationFrame` (capped ~20fps).
  This replaces Task 27's solid highlight outline for the active region.

## Data flow

The key simplification: every new tool ultimately produces a `Uint8Array`
mask and hands it to the *same* "create new region" / "merge into active
region" logic Magic Wand already uses, including the same Ctrl/Cmd-merge
convention (no modifier = new region, Ctrl/Cmd = merge into the active
region's mask, exactly as it works today). No new region-state plumbing is
needed — `RegionList`, `PaletteBrowser`, the border-color feature, and
`DownloadButton` are all unaffected by this phase.

## Error handling / edge cases

- Polygonal Lasso closed with fewer than 3 points, or a zero-movement Lasso
  drag (a plain click with no actual path): silently discarded, no new
  region created — consistent with how existing degenerate input is already
  handled elsewhere in the Studio. A zero-movement Brush click is treated
  differently and intentionally: it stamps a single dot at that spot, the
  same way a real brush tool works on a single click — this isn't
  degenerate input, so it isn't discarded.
- Escape cancels only an in-progress Polygonal Lasso; harmless no-op for
  every other tool/state.
- Spacebar-pan is suppressed while any text input has focus.

## Testing

- Unit tests (Vitest) for the three new pure modules against known
  shapes/paths — same pattern as the existing `floodFill`/`recolor` test
  suites.
- Pointer-interaction wiring (the toolbar, the drag gestures themselves,
  marching-ants animation) is verified by hand-tracing + manual dev-server
  checks, consistent with how Magic Wand, zoom, panning, and the border
  feature have always been verified in this project. No Playwright, per
  standing project policy.

## Follow-up (not this phase)

- Quick Selection, Magnetic Lasso: planned as later phases, not yet speced.
- Object Selection: parked for a separate discussion — no honest
  implementation exists without shipping an ML model, which is a much larger
  decision (bundle size, licensing, build complexity) than this project's
  scope so far.
- Keyboard shortcuts for tool switching.
