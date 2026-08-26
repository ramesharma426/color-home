"use client";

import type { Region } from "./ColorStudio";
import { rgbToHex } from "@/lib/canvas/colorMath";
import { SwatchRamp } from "./SwatchRamp";

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
      <p className="border border-dashed border-hairline-strong bg-chalk px-4 py-5 text-sm leading-relaxed text-graphite/65">
        Click a spot on the photo to select a wall, trim, or roof to recolor.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {regions.map((region) => {
        const isActive = region.id === activeRegionId;
        const hex = region.color ? rgbToHex(region.color) : null;

        return (
          <li key={region.id}>
            <button
              type="button"
              onClick={() => onSelectRegion(region.id)}
              aria-pressed={isActive}
              className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? "border-skylight bg-chalk shadow-[inset_3px_0_0_0_#3b5578]"
                  : "border-hairline-strong/60 bg-chalk/60 hover:border-graphite/40"
              }`}
            >
              <span className="h-7 w-9 shrink-0 overflow-hidden border border-graphite/15">
                {hex ? (
                  <SwatchRamp hex={hex} steps={3} className="h-full" />
                ) : (
                  <span
                    className="block h-full w-full"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, #dcdcdc 0 4px, #f7f7f7 4px 8px)",
                    }}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-bold tracking-tightest">
                  {region.label}
                </span>
                <span className="label-mono block text-graphite/60">
                  {hex ? hex.toUpperCase() : "No color yet"}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
