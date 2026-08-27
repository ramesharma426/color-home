"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvasWorker } from "@/lib/canvas/useCanvasWorker";
import { imageBitmapToBuffer } from "@/lib/canvas/imageBitmapToBuffer";
import { computeBorderMask } from "@/lib/canvas/borderMask";
import { contours } from "d3-contour";
import type { PixelBuffer, RGBColor } from "@/lib/canvas/types";
import { RegionList } from "./RegionList";
import { PaletteBrowser } from "./PaletteBrowser";
import { CatalogueBrowser } from "./CatalogueBrowser";
import { DownloadButton } from "./DownloadButton";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/dictionaries/types";
import { SelectionToolbar, type SelectionTool } from "./SelectionToolbar";
import { polygonToMask, type Point } from "@/lib/canvas/polygonMask";

export interface Region {
  id: string;
  mask: Uint8Array;
  color: RGBColor | null;
  label: string;
  recoloredData?: Uint8ClampedArray;
  borderColor?: RGBColor | null;
  borderRecoloredData?: Uint8ClampedArray;
}

const DEFAULT_TOLERANCE = 24;
const BORDER_THICKNESS = 4;

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lassoPathRef = useRef<Point[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);
  const polygonPointsRef = useRef<Point[]>([]);
  const [polygonPreview, setPolygonPreview] = useState<Point[]>([]);

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
        isSpacePanningRef.current = true;
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") isSpacePanningRef.current = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Escape discards an in-progress Polygonal Lasso without committing a region.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      polygonPointsRef.current = [];
      setPolygonPreview([]);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
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

      // Border pass: recomputed here rather than cached on the region since
      // it's a cheap boolean-array pass (no HSL math). Runs after this
      // region's own fill pass above so the border wins at the edge, while
      // region-to-region order is unchanged from before.
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
    ctx.putImageData(new ImageData(composed, baseBuffer.width, baseBuffer.height), 0, 0);
  }

  function handleWrapperPointerDown(event: React.PointerEvent<HTMLDivElement>) {
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
    wrapper.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
    wrapper.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
  }

  function handleWrapperPointerUp() {
    panStateRef.current = null;
    setIsPanning(false);
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

  function handleLassoPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "lasso" || event.button !== 0 || isSpacePanningRef.current) return;
    const point = canvasPointFromEvent(event);
    if (!point) return;
    lassoPathRef.current = [point];
    setIsDrawingLasso(true);
  }

  function handleLassoPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "lasso" || lassoPathRef.current.length === 0 || isSpacePanningRef.current) return;
    const point = canvasPointFromEvent(event);
    if (!point) return;
    lassoPathRef.current.push(point);
  }

  async function handleLassoPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "lasso" || lassoPathRef.current.length === 0) return;
    const path = lassoPathRef.current;
    lassoPathRef.current = [];
    setIsDrawingLasso(false);

    const baseBuffer = baseBufferRef.current;
    if (!baseBuffer || path.length < 3) return; // too short a drag — silently discard

    const newMask = polygonToMask(path, baseBuffer.width, baseBuffer.height);
    await commitToolMask(newMask, event.ctrlKey || event.metaKey);
  }

  const POLYGON_CLOSE_RADIUS = 8; // pixels, in buffer space — click near the start point to close

  function handlePolygonClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (activeTool !== "polygonLasso" || isSpacePanningRef.current) return;
    const point = canvasPointFromEvent(event);
    if (!point) return;

    const points = polygonPointsRef.current;
    if (points.length >= 3) {
      const start = points[0];
      const distanceToStart = Math.hypot(point.x - start.x, point.y - start.y);
      if (distanceToStart <= POLYGON_CLOSE_RADIUS) {
        finishPolygon(event.ctrlKey || event.metaKey);
        return;
      }
    }

    points.push(point);
    setPolygonPreview([...points]);
  }

  function handlePolygonDoubleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (activeTool !== "polygonLasso" || isSpacePanningRef.current) return;
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
    await commitToolMask(newMask, shouldMerge && Boolean(activeRegionId));
  }

  async function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
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
    await commitToolMask(newMask, (event.ctrlKey || event.metaKey) && Boolean(activeRegionId));
  }

  async function commitToolMask(newMask: Uint8Array, shouldMerge: boolean) {
    const baseBuffer = baseBufferRef.current;
    if (!baseBuffer) return;

    if (shouldMerge) {
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

  useEffect(render, [regions]);

  // Draw an animated dashed "marching ants" outline around the currently
  // active region on a separate overlay canvas stacked over the main one,
  // so the selection is visible on screen without ever being baked into the
  // composited image that DownloadButton reads from canvasRef. d3-contour
  // (not a hand-rolled tracer) is used because it correctly outlines every
  // disconnected patch of a region — a Ctrl+click merge (Task 28) can leave
  // one region spanning several unconnected patches, and a single-component
  // tracer would silently miss all but the first.
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    const baseBuffer = baseBufferRef.current;
    if (!overlay || !baseBuffer) return;

    overlay.width = baseBuffer.width;
    overlay.height = baseBuffer.height;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    const activeRegion = regions.find((r) => r.id === activeRegionId);
    if (!activeRegion) {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }

    const generator = contours().size([baseBuffer.width, baseBuffer.height]).smooth(false);
    const multiPolygon = generator.contour(Array.from(activeRegion.mask), 0.5);

    let animationFrameId: number;
    let lastFrameTime = 0;
    let dashOffset = 0;
    const FRAME_INTERVAL_MS = 50; // ~20fps — plenty smooth, cheap to keep running

    function drawFrame(time: number) {
      if (time - lastFrameTime >= FRAME_INTERVAL_MS) {
        lastFrameTime = time;
        dashOffset = (dashOffset + 1) % 8;

        ctx!.clearRect(0, 0, overlay!.width, overlay!.height);
        ctx!.setLineDash([4, 4]);
        ctx!.lineDashOffset = -dashOffset;
        ctx!.strokeStyle = "#ff00ff"; // bright magenta — distinct from any paint
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
      animationFrameId = requestAnimationFrame(drawFrame);
    }

    animationFrameId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [regions, activeRegionId]);

  // Live rubber-band preview of the in-progress Polygonal Lasso path, drawn on
  // the same overlay canvas as the marching ants above. Kept as a separate
  // effect (different deps) so it doesn't fight that animation loop's own
  // clearRect/draw cycle on every render.
  useEffect(() => {
    if (activeTool !== "polygonLasso" || polygonPreview.length === 0) return;
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    ctx.setLineDash([]);
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(polygonPreview[0].x, polygonPreview[0].y);
    for (let i = 1; i < polygonPreview.length; i++) {
      ctx.lineTo(polygonPreview[i].x, polygonPreview[i].y);
    }
    ctx.stroke();
  }, [polygonPreview, activeTool]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8">
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
            <SelectionToolbar activeTool={activeTool} onSelectTool={setActiveTool} locale={locale} />
            <div
              ref={wrapperRef}
              className="relative flex-1 overflow-auto border border-hairline"
              onPointerDown={handleWrapperPointerDown}
              onPointerMove={handleWrapperPointerMove}
              onPointerUp={handleWrapperPointerUp}
              onPointerLeave={handleWrapperPointerUp}
            >
              <canvas
                ref={canvasRef}
                onClick={(event) => {
                  handleCanvasClick(event);
                  handlePolygonClick(event);
                }}
                onDoubleClick={handlePolygonDoubleClick}
                onContextMenu={handleCanvasContextMenu}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleCanvasDrop}
                onPointerDown={handleLassoPointerDown}
                onPointerMove={handleLassoPointerMove}
                onPointerUp={handleLassoPointerUp}
                style={{ width: `${zoom}%`, height: "auto" }}
                className={
                  isPanning
                    ? "block cursor-grabbing"
                    : activeTool === "hand"
                    ? "block cursor-grab"
                    : "block cursor-crosshair"
                }
              />
              <canvas
                ref={overlayCanvasRef}
                style={{ width: `${zoom}%`, height: "auto" }}
                className="pointer-events-none absolute left-0 top-0"
              />
            </div>
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
              locale={locale}
            />
          </section>
          <section>
            <h2 className="label-mono mb-3 border-b border-hairline-strong/60 pb-2 text-graphite/70">
              {dict.studio.colorStepLabel}
            </h2>
            <PaletteBrowser onSelect={handleColorSelect} disabled={!activeRegionId} locale={locale} />
            {activeRegionId && (
              <div className="mt-4 space-y-2 border-t border-hairline-strong/60 pt-4">
                <label className="flex items-center gap-3 text-sm text-graphite/70">
                  <input
                    type="checkbox"
                    checked={borderPickerOpen}
                    onChange={(event) => {
                      setBorderPickerOpen(event.target.checked);
                      if (!event.target.checked) handleBorderColorSelect(null);
                    }}
                  />
                  <span>{dict.studio.borderCheckboxLabel}</span>
                </label>
                {borderPickerOpen && (
                  <PaletteBrowser onSelect={handleBorderColorSelect} locale={locale} />
                )}
              </div>
            )}
          </section>
          <DownloadButton canvasRef={canvasRef} locale={locale} />
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
