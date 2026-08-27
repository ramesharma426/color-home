"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvasWorker } from "@/lib/canvas/useCanvasWorker";
import { imageBitmapToBuffer } from "@/lib/canvas/imageBitmapToBuffer";
import { computeBorderMask } from "@/lib/canvas/borderMask";
import { hexToRgb } from "@/lib/canvas/colorMath";
import type { PixelBuffer, RGBColor } from "@/lib/canvas/types";
import { RegionList } from "./RegionList";
import { PaletteBrowser } from "./PaletteBrowser";
import { DownloadButton } from "./DownloadButton";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/dictionaries/types";

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
  const baseBufferRef = useRef<PixelBuffer | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState(DEFAULT_TOLERANCE);
  const [zoom, setZoom] = useState(100); // percent, 50-200
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
    setRegions((prev) => [
      ...prev,
      { id, mask, color: null, label: `${dict.studio.regionLabelPrefix} ${prev.length + 1}` },
    ]);
    setActiveRegionId(id);
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8">
      <div className="self-start border border-hairline-strong/60 bg-chalk p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-1">
          <p className="label-mono text-skylight">{dict.studio.canvasStepLabel}</p>
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
        <div className="overflow-auto border border-hairline">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleCanvasDrop}
            style={{ width: `${zoom}%`, height: "auto" }}
            className="block cursor-crosshair"
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
                  checked={Boolean(regions.find((r) => r.id === activeRegionId)?.borderColor)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      handleBorderColorSelect({ r: 255, g: 255, b: 255 });
                    } else {
                      handleBorderColorSelect(null);
                    }
                  }}
                />
                <span>{dict.studio.borderCheckboxLabel}</span>
              </label>
              {regions.find((r) => r.id === activeRegionId)?.borderColor && (
                <input
                  type="color"
                  onChange={(event) => handleBorderColorSelect(hexToRgb(event.target.value))}
                  className="h-8 w-12 align-middle"
                />
              )}
            </div>
          )}
        </section>
        <DownloadButton canvasRef={canvasRef} locale={locale} />
      </aside>
    </div>
  );
}
