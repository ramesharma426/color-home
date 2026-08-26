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
