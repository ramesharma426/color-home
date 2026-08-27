# Color Home

A static Next.js app (App Router, `output: "export"`, deployed via GitHub Pages) where a customer uploads a photo of their house, magic-wand-selects a surface (wall/trim/roof), picks a paint color, and downloads a realistic recolor — shadows, texture, and lighting preserved, not a flat fill. Bilingual (English + Nepali). Standalone project, not part of the owner's other repo (`building-care-enterprises`).

Owner: Ramesh Sharma. Hosted at `color.buildingcare.com.np` (see `CNAME`).

## Orientation

- **Spec:** `docs/superpowers/specs/2026-08-26-color-home-studio-design.md` — original product design.
- **Plan:** `docs/superpowers/plans/2026-08-26-color-home-studio.md` — the full task-by-task build log. Read this before assuming anything about "what's built" — it's the single source of truth, kept current, with every task's reasoning (including *why* a design decision reversed one made earlier). As of this writing: 31 tasks, all complete and reviewed except Task 24 (Playwright e2e), which was explicitly skipped per owner decision (see "Testing" below).
- This project was built almost entirely via `superpowers:subagent-driven-development` — one implementer subagent per task, followed by an independent reviewer subagent, both dispatched fresh with no shared context, verified via hand-traced logic + `tsc`/`vitest`/`curl`. If you're picking this back up, that's still the right process for new work: brainstorm → write the design into the plan doc as a new numbered task → dispatch an implementer → dispatch a reviewer → log completion. Don't skip the review step; several real bugs (a compositing bug, a shadow-selection bug, a disabled-attribute bug, a submodule gitlink) were caught only because of it.

## Hard-won operational rules

- **Never run `npm run build` while the dev server is running.** They both write to `.next/` in incompatible formats and corrupt each other — this has happened repeatedly. Always `kill` the dev server, `rm -rf .next`, build, then restart the dev server (`nohup npm run dev > /tmp/color-home-dev.log 2>&1 < /dev/null & disown`).
- **Do not use Playwright** for testing/verification in this project (explicit owner instruction). Verification is `npx tsc --noEmit` + `npm test` (Vitest) + `curl` against the dev server. Task 24 (a Playwright e2e test) was skipped for this reason.
- **Do not add Claude/Anthropic attribution anywhere** — not in commit messages (no `Co-Authored-By: Claude...` trailer), not in code comments, not in docs. Plain commit messages only.
- **Per-task commits are expected and fine** — the owner only asked to not push, and not to make ad-hoc commits outside the task-review flow without asking first. Never `git push`; the owner pushes themselves.
- Before any command that could discard uncommitted work, `git status` first — the owner sometimes commits/pushes independently (via IDE or terminal) in parallel with an agent session, so don't assume the working tree only reflects what you did.

## Architecture notes worth knowing before touching code

- **i18n is two separate route trees**, not Next's `[lang]` dynamic segment: English lives under `src/app/(en)/` (a route group — URLs are still `/`, `/studio`, `/colors`), Nepali mirrors live under `src/app/ne/`. Each has its own root `layout.tsx` declaring its own `<html lang>` — Next.js App Router genuinely cannot have one child layout override an ancestor's `<html>`/`<body>`, so this route-group split is required, not a style choice. All UI strings go through `src/dictionaries/{en,ne}.ts` via `getDictionary(locale)`; `Dictionary`'s TypeScript interface has no index signature specifically so a missing key in `ne.ts` is a compile error, not a silent gap.
- **Flood fill uses *local/adaptive* tolerance**, not seed-based — deliberately reversed from the original design (Task 4) after Task 25 found real photos' lighting gradients (a wall's lit side vs. its own shadowed side) exceed any reasonable global tolerance from a fixed seed color. Each pixel is compared to the neighbor that's proposing to add it, so a smooth gradient bridges step-by-step while a genuine hard edge still stops the fill. See `src/lib/canvas/floodFill.ts`.
- **Recolor preserves lightness, replaces hue/saturation** (`src/lib/canvas/recolor.ts`) — this is the whole product thesis (a paint bucket erases shadows; this doesn't). All pixel math is DOM-free and runs off the main thread via a Web Worker (`src/lib/canvas/worker.ts`).
- **Multi-region support**: click = new region, Ctrl/Cmd+click = merge into the active region's mask (lets one logical "region" span several disconnected patches), right-click = new region regardless of modifiers. See `handleCanvasClick`/`handleCanvasContextMenu` in `ColorStudio.tsx`.
- **Two color data sources, different shapes on purpose**: `src/data/palettes/berger-yellows-oranges.ts` (21 colors, hand-photographed swatch card, *visually estimated* hex, categorized by use — facade/trim/roof) powers the curated quick-pick swatches in the Studio. `src/data/palettes/berger-catalogue.ts` (1,575 colors) and `asian-paints-catalogue.ts` (1,828 colors) are *real published hex values* scraped directly from the brands' own sites, categorized by hue family, and power the searchable `CatalogueBrowser` (used both standalone on `/colors` and full-width inside the Studio). Don't merge these two systems — they serve different purposes and have incompatible category schemes.
- **No free-form color picker anywhere** — removed per owner request ("we cannot make any color in our machine"): the shop can only sell/mix colors that exist in a real catalog, so every color selection (fill or border) goes through a swatch, never an arbitrary `<input type="color">`.
- **`ColorStudio.tsx` is the most load-bearing, most-iterated-on file in the project.** It's been through ~15 tasks (region state, borders, drag-and-drop, i18n, zoom, a region-highlight overlay canvas, pan). Read its current full content before editing anything in it — briefs and even this file will drift from its exact current shape faster than most other files.

## Known, deliberately-parked follow-ups

- A Ctrl+click merge that grows a region's mask doesn't retroactively extend that region's *border* color to the newly-added edge (the border's recolored pixels are cached at pick-time against the old mask shape). Real, narrow, pre-existing gap in the border feature's caching model — not urgent, noted in Task 28's review.
- deploy.yml pins `node-version: "20"` (GitHub Actions warns this is deprecated) — owner was asked about bumping to `"22"`, never answered; still open.
- GitHub Pages' "Source" setting may still be "Deploy from a branch" rather than "GitHub Actions" — a `.nojekyll` file was added as a belt-and-suspenders fix for the resulting Jekyll build errors, but switching the Source setting (repo Settings → Pages) is the cleaner real fix and hasn't been confirmed done.
- Whether to rewrite git history to strip existing `Co-Authored-By: Claude` trailers from past commits was raised but not requested — do not do this without an explicit, separate ask, since it requires a force-push over history already partially pushed to GitHub.
