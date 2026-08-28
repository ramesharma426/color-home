"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCanvasWorker } from "@/lib/canvas/useCanvasWorker";
import { imageBitmapToBuffer } from "@/lib/canvas/imageBitmapToBuffer";
import { computeBorderMask } from "@/lib/canvas/borderMask";
import { contours } from "d3-contour";
import type { PixelBuffer, RGBColor } from "@/lib/canvas/types";
import { RegionList } from "./RegionList";
import { PaletteBrowser } from "./PaletteBrowser";
import { CatalogueBrowser } from "./CatalogueBrowser";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/dictionaries/types";
import { SelectionToolbar, type SelectionTool } from "./SelectionToolbar";
import { polygonToMask, type Point } from "@/lib/canvas/polygonMask";
import { paintBrushStroke } from "@/lib/canvas/brushMask";

export interface RegionLayer {
  id: string;
  label: string;
  color: RGBColor | null;
  mask: Uint8Array;
  recoloredData?: Uint8ClampedArray;
  borderColor?: RGBColor | null;
  borderRecoloredData?: Uint8ClampedArray;
}

export interface Region {
  id: string;
  mask: Uint8Array;
  color: RGBColor | null;
  label: string;
  recoloredData?: Uint8ClampedArray;
  borderColor?: RGBColor | null;
  borderRecoloredData?: Uint8ClampedArray;
  // Regions merged into this one via drag-and-drop (handleMergeRegions).
  // Each layer keeps its own mask/color/border rather than being flattened
  // into the base — see the compositeLayer comment in render().
  mergedLayers?: RegionLayer[];
}

const DEFAULT_TOLERANCE = 24;
const BORDER_THICKNESS = 4;
// Below this much pointer movement (in buffer-space pixels), a Lasso
// pointerdown/up pair is treated as a click placing a polygon vertex rather
// than a freehand drag — mirrors Photoshop's click-to-place-vertex Lasso mode.
const LASSO_DRAG_THRESHOLD = 6;

export function ColorStudio({ photo, locale }: { photo: ImageBitmap; locale: Locale }) {
  const dict = getDictionary(locale);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const baseBufferRef = useRef<PixelBuffer | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);
  const [zoom, setZoom] = useState(100); // percent, 50-200
  const [borderPickerOpen, setBorderPickerOpen] = useState(false);
  const { runFloodFill, runRecolor } = useCanvasWorker();
  const [activeTool, setActiveTool] = useState<SelectionTool>("magicWand");
  const isSpacePanningRef = useRef(false);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  // Tracks whether an actual pan occurred during the CURRENT pointer sequence
  // (set on every qualifying pointermove, not just once). Checking
  // isSpacePanningRef alone at click time is unreliable — the user can
  // release Spacebar before releasing the mouse button, so the ref may
  // already be false by the time the browser's synthetic `click` fires after
  // a Spacebar-pan drag. This ref is the thing handleCanvasClick actually
  // trusts to distinguish "this click ends a pan" from "this is a real click".
  const panDidOccurRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const lassoPathRef = useRef<Point[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);
  const lassoDownPointRef = useRef<Point | null>(null);
  // True once the current Lasso gesture has moved past LASSO_DRAG_THRESHOLD —
  // decides whether pointerup commits a freehand stroke or leaves vertex
  // placement to the trailing native click (see handleVertexClick).
  const lassoDraggedRef = useRef(false);
  // Set right before a freehand drag commits, so the native `click` that
  // fires on release doesn't also place a spurious polygon vertex. Reset at
  // the start of every new gesture (not just on consumption) in case a drag
  // ends outside the canvas and its trailing click never actually lands here.
  const lassoSuppressClickRef = useRef(false);
  const polygonPointsRef = useRef<Point[]>([]);
  const [polygonPreview, setPolygonPreview] = useState<Point[]>([]);
  const brushPathRef = useRef<Point[]>([]);
  const [brushSize, setBrushSize] = useState(15);
  const eraserPathRef = useRef<Point[]>([]);
  const [eraserSize, setEraserSize] = useState(15);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = photo.width;
    canvas.height = photo.height;
    baseBufferRef.current = imageBitmapToBuffer(photo);
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  // Keep the border checkbox/picker in sync with whichever region is
  // active, so switching regions shows that region's real border state
  // instead of a stale toggle from the previously active region.
  useEffect(() => {
    const activeRegion = regions.find((r) => r.id === activeRegionId);
    setBorderPickerOpen(Boolean(activeRegion?.borderColor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRegionId]);

  // Spacebar acts as a temporary pan override regardless of the active tool
  // (a common convention in image editors), so a Magic Wand user doesn't have
  // to switch to the Hand tool just to nudge the view. Guarded against typing
  // targets (e.g. the catalog search box) so hitting Space there doesn't hijack
  // the page instead of typing a space character.
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const tag = (target as HTMLElement | null)?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA";
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "Space" && !isTypingTarget(event.target)) {
        // Prevent Space's native default action: on <body> it scrolls the
        // page, and on a focused button (a toolbar button, a palette
        // swatch, DownloadButton) it activates that button — so holding
        // Space to pan could otherwise trigger a download or re-apply a
        // color as a side effect.
        event.preventDefault();
        isSpacePanningRef.current = true;
        setIsSpacePanning(true);
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        isSpacePanningRef.current = false;
        setIsSpacePanning(false);
      }
    }
    function handleBlur() {
      // If the user alt-tabs or a native dialog opens while Space is held,
      // keyup never fires and the flag would otherwise stay true forever,
      // silently breaking Lasso/Polygonal Lasso/Brush until Space happens
      // to be pressed and released again.
      isSpacePanningRef.current = false;
      setIsSpacePanning(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Escape discards an in-progress Polygonal Lasso or click-placed Lasso
  // vertex chain without committing a region. Backspace undoes only the
  // most recently placed vertex, so a misplaced point doesn't force
  // restarting the whole shape. With no in-progress polygon to cancel,
  // Escape instead deselects the active region — the canvas/keyboard
  // equivalent of clicking an already-active row in the region list (its
  // only other deselect path, RegionList.tsx's isActive-toggle button).
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const tag = (target as HTMLElement | null)?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA";
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (polygonPointsRef.current.length > 0) {
        polygonPointsRef.current = [];
        setPolygonPreview([]);
        return;
      }
      setActiveRegionId(null);
    }
    function handleBackspace(event: KeyboardEvent) {
      if (event.key !== "Backspace" || isTypingTarget(event.target)) return;
      if (polygonPointsRef.current.length === 0) return;
      event.preventDefault(); // outside a text field, Backspace can trigger browser back-navigation
      polygonPointsRef.current = polygonPointsRef.current.slice(0, -1);
      setPolygonPreview([...polygonPointsRef.current]);
    }
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("keydown", handleBackspace);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("keydown", handleBackspace);
    };
  }, []);

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
    const { width: bufferWidth, height: bufferHeight } = baseBuffer;

    // Shared by a region's own (base) layer and any mergedLayers it has
    // absorbed — see handleMergeRegions. A merged-in layer keeps its own
    // mask/color/border entirely separate from the base rather than being
    // flattened into one mask+color, so composing it is identical to
    // composing a plain region.
    function compositeLayer(layer: {
      mask: Uint8Array;
      recoloredData?: Uint8ClampedArray;
      borderRecoloredData?: Uint8ClampedArray;
    }) {
      if (layer.recoloredData) {
        for (let pixelIndex = 0; pixelIndex < layer.mask.length; pixelIndex++) {
          if (!layer.mask[pixelIndex]) continue;
          const offset = pixelIndex * 4;
          composed[offset] = layer.recoloredData[offset];
          composed[offset + 1] = layer.recoloredData[offset + 1];
          composed[offset + 2] = layer.recoloredData[offset + 2];
          composed[offset + 3] = layer.recoloredData[offset + 3];
        }
      }

      // Border pass: recomputed here rather than cached since it's a cheap
      // boolean-array pass (no HSL math). Runs after the fill pass above so
      // the border wins at the edge.
      if (!layer.borderRecoloredData) return;
      const borderMask = computeBorderMask(layer.mask, bufferWidth, bufferHeight, BORDER_THICKNESS);
      for (let pixelIndex = 0; pixelIndex < borderMask.length; pixelIndex++) {
        if (!borderMask[pixelIndex]) continue;
        const offset = pixelIndex * 4;
        composed[offset] = layer.borderRecoloredData[offset];
        composed[offset + 1] = layer.borderRecoloredData[offset + 1];
        composed[offset + 2] = layer.borderRecoloredData[offset + 2];
        composed[offset + 3] = layer.borderRecoloredData[offset + 3];
      }
    }

    for (const region of regions) {
      compositeLayer(region);
      // Merged-in layers composite after the base so a dropped-in region's
      // own color wins on any pixels it shares with the base or an earlier
      // merged layer, per the owner's explicit "dragged region takes
      // precedence" call — region-to-region order is unchanged from before.
      for (const layer of region.mergedLayers ?? []) {
        compositeLayer(layer);
      }
    }
    ctx.putImageData(new ImageData(composed, baseBuffer.width, baseBuffer.height), 0, 0);
  }

  function handleWrapperPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Reset at the start of every fresh pointer-down so a stale `true` from a
    // previous pan can never leak into an unrelated later click that wasn't
    // preceded by a pan on this new pointer sequence.
    panDidOccurRef.current = false;
    if (event.button !== 0) return; // left button only — don't interfere with right-click
    if (activeTool !== "hand" && !isSpacePanningRef.current) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    panStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: wrapper.scrollLeft,
      scrollTop: wrapper.scrollTop,
    };
    setIsPanning(true);
  }

  function handleWrapperPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const pan = panStateRef.current;
    const wrapper = wrapperRef.current;
    if (!pan || !wrapper) return;
    panDidOccurRef.current = true;
    wrapper.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
    wrapper.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
  }

  function handleWrapperPointerUp() {
    panStateRef.current = null;
    setIsPanning(false);
  }

  function handleWrapperWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.altKey) return; // plain scroll still scrolls the wrapper normally
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1; // scroll up = zoom in, scroll down = zoom out
    setZoom((prev) => Math.min(200, Math.max(50, prev + direction * 10)));
  }

  function canvasPointFromEvent(event: { clientX: number; clientY: number }): Point | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((event.clientX - rect.left) * scaleX),
      y: Math.round((event.clientY - rect.top) * scaleY),
    };
  }

  function handleToolCursorMove(event: React.PointerEvent<HTMLCanvasElement>) {
    setCursorPos(canvasPointFromEvent(event));
  }

  function handleLassoPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "lasso" || event.button !== 0 || isSpacePanningRef.current) return;
    const point = canvasPointFromEvent(event);
    if (!point) return;
    lassoDownPointRef.current = point;
    lassoDraggedRef.current = false;
    lassoSuppressClickRef.current = false;
    lassoPathRef.current = [point];
    setIsDrawingLasso(true);
    // Route all subsequent pointer events for this gesture to the canvas
    // regardless of where the cursor physically ends up — without this, a
    // drag that leaves the canvas (routine at zoom <= 100%, where the
    // wrapper is wider than the photo) releases over some other element and
    // the canvas never sees the pointerup, silently discarding the stroke.
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleLassoPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    // isDrawingLasso is the authoritative "currently drawing" flag; the
    // ref-based length check is kept only as a same-tick fallback for the
    // instant right after pointerdown, before the state update has
    // committed. Once handleLassoPointerUp has run, both are false/empty, so
    // a stray pointer move over the canvas can never resume appending to an
    // abandoned path.
    const isDrawing = isDrawingLasso || lassoPathRef.current.length > 0;
    if (activeTool !== "lasso" || !isDrawing || isSpacePanningRef.current) return;
    const point = canvasPointFromEvent(event);
    if (!point) return;

    const downPoint = lassoDownPointRef.current;
    if (downPoint && !lassoDraggedRef.current) {
      const distance = Math.hypot(point.x - downPoint.x, point.y - downPoint.y);
      if (distance > LASSO_DRAG_THRESHOLD) {
        lassoDraggedRef.current = true;
        // A genuine freehand drag supersedes any vertices already placed by
        // clicks earlier in this Lasso session — mixing click-vertices with
        // a freehand stroke isn't supported, so drop the pending polygon
        // rather than leave its preview line stuck on screen after the drag
        // commits a completely different region.
        if (polygonPointsRef.current.length > 0) {
          polygonPointsRef.current = [];
          setPolygonPreview([]);
        }
      }
    }
    lassoPathRef.current.push(point);
  }

  async function handleLassoPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "lasso" || lassoPathRef.current.length === 0) return;
    const path = lassoPathRef.current;
    const wasDrag = lassoDraggedRef.current;
    lassoPathRef.current = [];
    lassoDownPointRef.current = null;
    setIsDrawingLasso(false);

    if (!wasDrag) {
      // Too little movement to count as a freehand stroke — leave vertex
      // placement to the trailing native click (handleVertexClick), which
      // shares Polygonal Lasso's click-to-vertex/close machinery.
      return;
    }
    lassoSuppressClickRef.current = true; // this drag's release also fires a click — swallow it

    const baseBuffer = baseBufferRef.current;
    if (!baseBuffer || path.length < 3) return; // too short a drag — silently discard

    const newMask = polygonToMask(path, baseBuffer.width, baseBuffer.height);
    await commitToolMask(newMask, event.ctrlKey || event.metaKey);
  }

  function handleBrushPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "brush" || event.button !== 0 || isSpacePanningRef.current) return;
    const point = canvasPointFromEvent(event);
    if (!point) return;
    brushPathRef.current = [point];
    // See handleLassoPointerDown — same reasoning: keep the gesture routed
    // to the canvas even if the drag leaves its bounds.
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleBrushPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "brush" || brushPathRef.current.length === 0 || isSpacePanningRef.current) return;
    const point = canvasPointFromEvent(event);
    if (!point) return;
    brushPathRef.current.push(point);
  }

  async function handleBrushPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "brush" || brushPathRef.current.length === 0) return;
    const path = brushPathRef.current;
    brushPathRef.current = [];

    const baseBuffer = baseBufferRef.current;
    if (!baseBuffer || path.length === 0) return;

    const ctrlOrMeta = event.ctrlKey || event.metaKey;
    // This Boolean(activeRegionId) check is kept here — it picks the
    // *starting mask* for paintBrushStroke (paint onto the existing active
    // region vs. a blank canvas), a different decision from whether
    // commitToolMask should merge. commitToolMask makes that call itself now.
    const isMergeForBaseMask = ctrlOrMeta && Boolean(activeRegionId);
    const baseMask = isMergeForBaseMask
      ? regions.find((r) => r.id === activeRegionId)?.mask ?? new Uint8Array(baseBuffer.width * baseBuffer.height)
      : new Uint8Array(baseBuffer.width * baseBuffer.height);

    const newMask = paintBrushStroke(baseMask, baseBuffer.width, baseBuffer.height, path, brushSize);
    await commitToolMask(newMask, ctrlOrMeta);
  }

  function handleEraserPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "eraser" || event.button !== 0 || isSpacePanningRef.current) return;
    const point = canvasPointFromEvent(event);
    if (!point) return;
    eraserPathRef.current = [point];
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleEraserPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "eraser" || eraserPathRef.current.length === 0 || isSpacePanningRef.current) return;
    const point = canvasPointFromEvent(event);
    if (!point) return;
    eraserPathRef.current.push(point);
  }

  async function handleEraserPointerUp() {
    if (activeTool !== "eraser" || eraserPathRef.current.length === 0) return;
    const path = eraserPathRef.current;
    eraserPathRef.current = [];

    const baseBuffer = baseBufferRef.current;
    if (!baseBuffer || !activeRegionId) return; // nothing to erase without a selected region

    const activeRegion = regions.find((r) => r.id === activeRegionId);
    if (!activeRegion) return;

    // Stamp the eraser's circles into an empty mask (reusing paintBrushStroke's
    // circle-stamping — identical math to the Brush tool), then SUBTRACT that
    // stroke from the region's real mask (AND NOT), rather than adding to it.
    // This is what makes erasing "remembered": the pixels are permanently gone
    // from region.mask, so any future recolor recomputes from the shrunk mask
    // and never repaints them, unlike a purely-visual undo of the last paint.
    const emptyMask = new Uint8Array(baseBuffer.width * baseBuffer.height);
    const eraserStroke = paintBrushStroke(emptyMask, baseBuffer.width, baseBuffer.height, path, eraserSize);

    const shrunkMask = new Uint8Array(activeRegion.mask.length);
    for (let i = 0; i < shrunkMask.length; i++) {
      shrunkMask[i] = activeRegion.mask[i] && !eraserStroke[i] ? 1 : 0;
    }

    let recoloredData = activeRegion.recoloredData;
    if (activeRegion.color) {
      const recoloredBuffer = await runRecolor(baseBuffer, shrunkMask, activeRegion.color);
      recoloredData = recoloredBuffer.data;
    }

    setRegions((prev) =>
      prev.map((r) => (r.id === activeRegionId ? { ...r, mask: shrunkMask, recoloredData } : r))
    );
  }

  // A fixed buffer-space radius would shrink on screen as the user zooms
  // out (very likely while placing several corners of a shape), making the
  // close target increasingly hard to hit. Scaling by zoom keeps the actual
  // on-screen target a consistent ~16px regardless of zoom level.
  const polygonCloseRadius = 1600 / zoom;

  // Click-to-vertex placement, shared by Polygonal Lasso (always in this
  // mode) and the plain Lasso tool (only when a gesture was a click, not a
  // drag — see handleLassoPointerUp/lassoSuppressClickRef). A click ending a
  // Lasso freehand drag still fires this handler afterward; that trailing
  // call is swallowed via lassoSuppressClickRef before anything else runs.
  function handleVertexClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (activeTool === "lasso" && lassoSuppressClickRef.current) {
      lassoSuppressClickRef.current = false;
      return;
    }
    if ((activeTool !== "polygonLasso" && activeTool !== "lasso") || isSpacePanningRef.current) return;
    const point = canvasPointFromEvent(event);
    if (!point) return;

    const points = polygonPointsRef.current;
    if (points.length >= 3) {
      const start = points[0];
      const distanceToStart = Math.hypot(point.x - start.x, point.y - start.y);
      if (distanceToStart <= polygonCloseRadius) {
        finishPolygon(event.ctrlKey || event.metaKey);
        return;
      }
    }

    points.push(point);
    setPolygonPreview([...points]);
  }

  function handleVertexDoubleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if ((activeTool !== "polygonLasso" && activeTool !== "lasso") || isSpacePanningRef.current) return;
    event.preventDefault();
    finishPolygon(event.ctrlKey || event.metaKey);
  }

  async function finishPolygon(shouldMerge: boolean) {
    const points = polygonPointsRef.current;
    polygonPointsRef.current = [];
    setPolygonPreview([]);

    const baseBuffer = baseBufferRef.current;
    if (!baseBuffer || points.length < 3) return; // too few vertices — silently discard

    const newMask = polygonToMask(points, baseBuffer.width, baseBuffer.height);
    await commitToolMask(newMask, shouldMerge);
  }

  async function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
    // A pan (whether via the Hand tool or a Spacebar override) that ends
    // over the canvas still fires a native `click` on release — there's no
    // pointercancel to distinguish it. If a pan actually occurred during
    // this pointer sequence, consume the flag and bail before doing
    // anything else, so Magic Wand (the default active tool) doesn't flood
    // fill and create a spurious, undeletable region on every pan.
    if (panDidOccurRef.current) {
      panDidOccurRef.current = false;
      return;
    }
    if (activeTool !== "magicWand") return;
    const canvas = canvasRef.current;
    const baseBuffer = baseBufferRef.current;
    if (!canvas || !baseBuffer) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);

    const newMask = await runFloodFill(baseBuffer, x, y, tolerance);
    await commitToolMask(newMask, event.ctrlKey || event.metaKey);
  }

  // shouldMerge is trusted at face value here — this is the one place that
  // decides whether a raw ctrl/meta modifier actually means "merge into the
  // active region", including checking that a region is even active. Every
  // call site just passes the raw modifier check; none of them should
  // reintroduce their own Boolean(activeRegionId) wrapper (a prior drift
  // where the Lasso call site omitted it caused Ctrl+drag with no active
  // region to silently no-op instead of falling through to create a new
  // region like every other tool).
  async function commitToolMask(newMask: Uint8Array, shouldMerge: boolean) {
    const baseBuffer = baseBufferRef.current;
    if (!baseBuffer) return;

    if (shouldMerge && activeRegionId) {
      const activeRegion = regions.find((r) => r.id === activeRegionId);
      if (!activeRegion) return;

      const mergedMask = new Uint8Array(activeRegion.mask.length);
      for (let i = 0; i < mergedMask.length; i++) {
        mergedMask[i] = activeRegion.mask[i] || newMask[i] ? 1 : 0;
      }

      let recoloredData = activeRegion.recoloredData;
      if (activeRegion.color) {
        const recoloredBuffer = await runRecolor(baseBuffer, mergedMask, activeRegion.color);
        recoloredData = recoloredBuffer.data;
      }

      setRegions((prev) =>
        prev.map((r) => (r.id === activeRegionId ? { ...r, mask: mergedMask, recoloredData } : r))
      );
      return;
    }

    const id = crypto.randomUUID();
    setRegions((prev) => [
      ...prev,
      { id, mask: newMask, color: null, label: `${dict.studio.regionLabelPrefix} ${prev.length + 1}` },
    ]);
    setActiveRegionId(id);
  }

  async function handleCanvasContextMenu(event: React.MouseEvent<HTMLCanvasElement>) {
    event.preventDefault(); // suppress the browser's context menu
    await handleCanvasClick(event); // identical behavior to a plain left-click — always a new region
  }

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
      {
        id,
        mask,
        color,
        label: `${dict.studio.regionLabelPrefix} ${prev.length + 1}`,
        recoloredData: recoloredBuffer.data,
      },
    ]);
    setActiveRegionId(id);
  }

  function handleDeleteRegion(id: string) {
    setRegions((prev) => prev.filter((r) => r.id !== id));
    if (activeRegionId === id) setActiveRegionId(null);
  }

  // Dropping sourceId onto targetId merges them into one region-list row.
  // The two masks/colors are kept entirely separate (not OR'd into one mask
  // recolored with one color) so each side's existing paint job survives —
  // sourceId becomes a mergedLayer on targetId, composited after targetId's
  // own layer (and after any earlier merged layers) so it wins on any
  // overlapping pixels, per the owner's explicit call. This also makes
  // unmerge lossless: nothing was ever combined at the pixel level.
  function handleMergeRegions(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    setRegions((prev) => {
      const source = prev.find((r) => r.id === sourceId);
      const target = prev.find((r) => r.id === targetId);
      if (!source || !target) return prev;

      const sourceLayer: RegionLayer = {
        id: source.id,
        label: source.label,
        color: source.color,
        mask: source.mask,
        recoloredData: source.recoloredData,
        borderColor: source.borderColor,
        borderRecoloredData: source.borderRecoloredData,
      };
      // Merging a region that's already absorbed layers of its own flattens
      // them onto the target in their existing relative order, rather than
      // nesting a group inside a group.
      const incomingLayers = [...(source.mergedLayers ?? []), sourceLayer];

      return prev
        .filter((r) => r.id !== sourceId)
        .map((r) =>
          r.id === targetId ? { ...r, mergedLayers: [...(r.mergedLayers ?? []), ...incomingLayers] } : r
        );
    });
    if (activeRegionId === sourceId) setActiveRegionId(targetId);
  }

  // LIFO unmerge: pops the most recently merged-in layer off a region and
  // reinstates it as its own independent top-level region, with its
  // original id/label/color/mask restored exactly — see handleMergeRegions.
  function handleUnmergeLastLayer(targetId: string) {
    setRegions((prev) => {
      const target = prev.find((r) => r.id === targetId);
      const layers = target?.mergedLayers;
      if (!target || !layers || layers.length === 0) return prev;

      const restoredLayer = layers[layers.length - 1];
      const remainingLayers = layers.slice(0, -1);
      const restoredRegion: Region = {
        id: restoredLayer.id,
        label: restoredLayer.label,
        color: restoredLayer.color,
        mask: restoredLayer.mask,
        recoloredData: restoredLayer.recoloredData,
        borderColor: restoredLayer.borderColor,
        borderRecoloredData: restoredLayer.borderRecoloredData,
      };

      return prev
        .map((r) => (r.id === targetId ? { ...r, mergedLayers: remainingLayers } : r))
        .concat(restoredRegion);
    });
  }

  function handleRenameRegion(id: string, label: string) {
    setRegions((prev) => prev.map((r) => (r.id === id ? { ...r, label } : r)));
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

  function handleToggleBorder(checked: boolean) {
    setBorderPickerOpen(checked);
    if (!checked) handleBorderColorSelect(null);
  }

  useEffect(render, [regions]);

  // Draw an animated dashed "marching ants" outline around the currently
  // active region, AND (when a Polygonal Lasso, or a click-placed Lasso
  // vertex chain, is in progress) the dashed rubber-band preview line —
  // including a live segment that follows the cursor to the next click — on
  // a separate overlay canvas stacked over the main one, so the selection is
  // visible on screen without ever being
  // baked into the composited image that DownloadButton reads from
  // canvasRef. d3-contour (not a hand-rolled tracer) is used for the ants
  // because it correctly outlines every disconnected patch of a region — a
  // Ctrl+click merge (Task 28) can leave one region spanning several
  // unconnected patches, and a single-component tracer would silently miss
  // all but the first.
  //
  // Both layers are drawn from this single effect/render-loop rather than
  // two independent ones: they share the same overlay canvas, and two
  // uncoordinated clearRect/draw cycles fight each other — the ants loop's
  // ~20fps clear was wiping out the preview line within one frame, and a
  // preview-only effect that returns early on an empty preview never clears
  // its own last-drawn line, leaving a stray line stuck on screen after
  // Escape or a successful close. One authority, one clear-then-redraw-both
  // per frame, fixes both.
  // The marching-squares contour is the expensive part of the overlay (a
  // full Array.from + d3-contour pass over a mask that can be ~1.9M elements
  // for a 1600px-long-edge photo). It depends only on which region is
  // active and that region's mask shape — NOT on polygonPreview, which
  // changes on every vertex click while placing a Polygonal Lasso. Keeping
  // this in its own memo (rather than inline in the draw effect below) means
  // clicking polygon vertices no longer re-runs this computation at all.
  const activeRegionContour = useMemo(() => {
    const baseBuffer = baseBufferRef.current;
    const activeRegion = regions.find((r) => r.id === activeRegionId);
    if (!baseBuffer || !activeRegion) return null;
    return contours().size([baseBuffer.width, baseBuffer.height]).smooth(false).contour(Array.from(activeRegion.mask), 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, activeRegionId]);

  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    const baseBuffer = baseBufferRef.current;
    if (!overlay || !baseBuffer) return;

    overlay.width = baseBuffer.width;
    overlay.height = baseBuffer.height;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    const activeRegion = regions.find((r) => r.id === activeRegionId);
    const showPreview =
      (activeTool === "polygonLasso" || activeTool === "lasso") && polygonPreview.length > 0;
    const showSizeCursor = (activeTool === "brush" || activeTool === "eraser") && cursorPos !== null;
    const showLassoPreview = activeTool === "lasso" && isDrawingLasso;

    if (!activeRegion && !showPreview && !showSizeCursor && !showLassoPreview) {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }

    const multiPolygon = activeRegionContour;

    let animationFrameId: number;
    let lastFrameTime = 0;
    let dashOffset = 0;
    const FRAME_INTERVAL_MS = 50; // ~20fps — plenty smooth, cheap to keep running

    function drawFrame(time: number) {
      if (time - lastFrameTime >= FRAME_INTERVAL_MS) {
        lastFrameTime = time;
        dashOffset = (dashOffset + 1) % 8;

        ctx!.clearRect(0, 0, overlay!.width, overlay!.height);

        if (multiPolygon) {
          ctx!.setLineDash([4, 4]);
          ctx!.lineDashOffset = -dashOffset;
          ctx!.strokeStyle = "#000000"; // black — distinct from any paint
          ctx!.lineWidth = 1; // color a user could realistically pick
          for (const polygon of multiPolygon.coordinates) {
            for (const ring of polygon) {
              ctx!.beginPath();
              ctx!.moveTo(ring[0][0], ring[0][1]);
              for (let i = 1; i < ring.length; i++) ctx!.lineTo(ring[i][0], ring[i][1]);
              ctx!.stroke();
            }
          }
        }

        if (showPreview) {
          ctx!.setLineDash([4, 4]); // dotted, like the app's other selection-outline convention
          ctx!.strokeStyle = "#000000";
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(polygonPreview[0].x, polygonPreview[0].y);
          for (let i = 1; i < polygonPreview.length; i++) {
            ctx!.lineTo(polygonPreview[i].x, polygonPreview[i].y);
          }
          // Rubber-band segment from the last placed vertex to the live
          // cursor — the part that actually "moves along" between clicks.
          if (cursorPos) ctx!.lineTo(cursorPos.x, cursorPos.y);
          ctx!.stroke();
        }

        if (showPreview) {
          ctx!.setLineDash([]);
          ctx!.strokeStyle = "#3b5578"; // skylight — same helper-overlay blue as the Brush/Eraser size circle
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.arc(polygonPreview[0].x, polygonPreview[0].y, polygonCloseRadius, 0, Math.PI * 2);
          ctx!.stroke();
        }

        if (showSizeCursor && cursorPos) {
          const radius = activeTool === "brush" ? brushSize : eraserSize;
          ctx!.setLineDash([]);
          ctx!.strokeStyle = "#3b5578"; // skylight — the app's UI-accent blue, distinct from
          ctx!.lineWidth = 1; // both the black selection outline and any paint color
          ctx!.beginPath();
          ctx!.arc(cursorPos.x, cursorPos.y, radius, 0, Math.PI * 2);
          ctx!.stroke();
        }

        if (showLassoPreview && lassoPathRef.current.length > 0) {
          const path = lassoPathRef.current;
          ctx!.setLineDash([]);
          ctx!.strokeStyle = "#000000";
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(path[0].x, path[0].y);
          for (let i = 1; i < path.length; i++) ctx!.lineTo(path[i].x, path[i].y);
          ctx!.stroke();
        }
      }
      animationFrameId = requestAnimationFrame(drawFrame);
    }

    animationFrameId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [regions, activeRegionId, polygonPreview, activeTool, cursorPos, brushSize, eraserSize, isDrawingLasso, zoom]);

  function canvasCursorClassName(): string {
    if (isPanning) return "block cursor-grabbing";
    if (isSpacePanning) return "block cursor-grab"; // Spacebar overrides every tool's own cursor
    if (activeTool === "hand") return "block cursor-grab";
    if (activeTool === "brush" || activeTool === "eraser") return "block cursor-none"; // Task 41's drawn circle is the only indicator now
    return "block cursor-crosshair";
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-8">
        <div className="self-start border border-hairline-strong/60 bg-chalk p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-1">
            <p className="label-mono text-skylight">{dict.studio.canvasStepLabel}</p>
            {activeTool === "magicWand" && (
              <label className="label-mono flex items-center gap-3 text-graphite/70">
                <span>{dict.studio.sensitivityLabel}</span>
                <input
                  type="range"
                  min={5}
                  max={80}
                  value={tolerance}
                  onChange={(event) => setTolerance(Number(event.target.value))}
                  className="h-1 w-28 cursor-pointer accent-skylight align-middle"
                />
                <span className="w-6 tabular-nums text-graphite">{tolerance}</span>
              </label>
            )}
            {activeTool === "brush" && (
              <label className="label-mono flex items-center gap-3 text-graphite/70">
                <span>{dict.studio.brushSizeLabel}</span>
                <input
                  type="range"
                  min={4}
                  max={60}
                  value={brushSize}
                  onChange={(event) => setBrushSize(Number(event.target.value))}
                  className="h-1 w-28 cursor-pointer accent-skylight align-middle"
                />
                <span className="w-6 tabular-nums text-graphite">{brushSize}</span>
              </label>
            )}
            {activeTool === "eraser" && (
              <label className="label-mono flex items-center gap-3 text-graphite/70">
                <span>{dict.studio.eraserSizeLabel}</span>
                <input
                  type="range"
                  min={4}
                  max={60}
                  value={eraserSize}
                  onChange={(event) => setEraserSize(Number(event.target.value))}
                  className="h-1 w-28 cursor-pointer accent-skylight align-middle"
                />
                <span className="w-6 tabular-nums text-graphite">{eraserSize}</span>
              </label>
            )}
            <label className="label-mono flex items-center gap-3 text-graphite/70">
              <span>{dict.studio.zoomLabel}</span>
              <input
                type="range"
                min={50}
                max={200}
                step={10}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="h-1 w-28 cursor-pointer accent-skylight align-middle"
              />
              <span className="w-10 tabular-nums text-graphite">{zoom}%</span>
            </label>
          </div>
          <div className="flex gap-3">
            <div
              ref={wrapperRef}
              className="relative flex-1 overflow-auto border border-hairline"
              onPointerDown={handleWrapperPointerDown}
              onPointerMove={handleWrapperPointerMove}
              onPointerUp={handleWrapperPointerUp}
              onPointerLeave={handleWrapperPointerUp}
              onWheel={handleWrapperWheel}
            >
              <canvas
                ref={canvasRef}
                onClick={(event) => {
                  handleCanvasClick(event);
                  handleVertexClick(event);
                }}
                onDoubleClick={handleVertexDoubleClick}
                onContextMenu={handleCanvasContextMenu}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleCanvasDrop}
                onPointerDown={(event) => {
                  handleLassoPointerDown(event);
                  handleBrushPointerDown(event);
                  handleEraserPointerDown(event);
                }}
                onPointerMove={(event) => {
                  handleLassoPointerMove(event);
                  handleBrushPointerMove(event);
                  handleEraserPointerMove(event);
                  handleToolCursorMove(event);
                }}
                onPointerUp={(event) => {
                  handleLassoPointerUp(event);
                  handleBrushPointerUp(event);
                  handleEraserPointerUp();
                }}
                onPointerCancel={(event) => {
                  handleLassoPointerUp(event);
                  handleBrushPointerUp(event);
                  handleEraserPointerUp();
                }}
                onPointerLeave={() => setCursorPos(null)}
                style={{ width: `${zoom}%`, height: "auto" }}
                className={canvasCursorClassName()}
              />
              <canvas
                ref={overlayCanvasRef}
                style={{ width: `${zoom}%`, height: "auto" }}
                className="pointer-events-none absolute left-0 top-0"
              />
            </div>
            <SelectionToolbar
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              locale={locale}
              borderCheckboxVisible={Boolean(activeRegionId)}
              borderEnabled={borderPickerOpen}
              onToggleBorder={handleToggleBorder}
              canvasRef={canvasRef}
            />
          </div>
        </div>
        <aside className="space-y-8">
          <section>
            <h2 className="label-mono mb-3 border-b border-hairline-strong/60 pb-2 text-graphite/70">
              {dict.studio.selectedSurfacesHeading}
            </h2>
            <RegionList
              regions={regions}
              activeRegionId={activeRegionId}
              onSelectRegion={setActiveRegionId}
              onDeleteRegion={handleDeleteRegion}
              onRenameRegion={handleRenameRegion}
              onMergeRegions={handleMergeRegions}
              onUnmergeLastLayer={handleUnmergeLastLayer}
              locale={locale}
            />
          </section>
          {activeRegionId && borderPickerOpen && (
            <section>
              <h2 className="label-mono mb-3 border-b border-hairline-strong/60 pb-2 text-graphite/70">
                {dict.studio.colorStepLabel}
              </h2>
              <PaletteBrowser onSelect={handleBorderColorSelect} locale={locale} />
            </section>
          )}
        </aside>
      </div>
      <section>
        <h2 className="label-mono mb-3 border-b border-hairline-strong/60 pb-2 text-graphite/70">
          Browse the full catalog
        </h2>
        <CatalogueBrowser onSelect={handleColorSelect} disabled={!activeRegionId} />
      </section>
    </div>
  );
}
