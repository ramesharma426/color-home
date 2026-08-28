"use client";

import { useRef, useState } from "react";
import type { Region } from "./ColorStudio";
import { rgbToHex } from "@/lib/canvas/colorMath";
import { SwatchRamp } from "./SwatchRamp";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/dictionaries/types";

export function RegionList({
  regions,
  activeRegionId,
  onSelectRegion,
  onDeleteRegion,
  onRenameRegion,
  onMergeRegions,
  onUnmergeLastLayer,
  locale,
}: {
  regions: Region[];
  activeRegionId: string | null;
  onSelectRegion: (id: string | null) => void;
  onDeleteRegion: (id: string) => void;
  onRenameRegion: (id: string, label: string) => void;
  onMergeRegions: (sourceId: string, targetId: string) => void;
  onUnmergeLastLayer: (targetId: string) => void;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const suppressBlurRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  if (regions.length === 0) {
    return (
      <p className="border border-dashed border-hairline-strong bg-chalk px-4 py-5 text-sm leading-relaxed text-graphite/65">
        {dict.studio.regionsEmptyState}
      </p>
    );
  }

  function commitRename(id: string) {
    const trimmed = draftLabel.trim();
    if (trimmed) onRenameRegion(id, trimmed);
    setEditingId(null);
  }

  return (
    <ul className="space-y-1.5">
      {regions.map((region) => {
        const isActive = region.id === activeRegionId;
        const hex = region.color ? rgbToHex(region.color) : null;
        const isEditing = editingId === region.id;

        const mergedLayers = region.mergedLayers ?? [];
        const isDropTarget = dropTargetId === region.id;

        return (
          <li key={region.id}>
            <div
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                setDraggingId(region.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTargetId(null);
              }}
              onDragOver={(event) => {
                if (!draggingId || draggingId === region.id) return;
                event.preventDefault(); // required to allow a drop
                event.dataTransfer.dropEffect = "move";
                setDropTargetId(region.id);
              }}
              onDragLeave={() => {
                setDropTargetId((current) => (current === region.id ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDropTargetId(null);
                if (draggingId && draggingId !== region.id) onMergeRegions(draggingId, region.id);
                setDraggingId(null);
              }}
              className={`flex w-full items-center gap-3 border px-3 py-2.5 transition-colors ${
                isActive
                  ? "border-skylight bg-chalk shadow-[inset_3px_0_0_0_#3b5578]"
                  : "border-hairline-strong/60 bg-chalk/60 hover:border-graphite/40"
              } ${isDropTarget ? "border-signal bg-signal/5" : ""} ${draggingId === region.id ? "opacity-40" : ""}`}
            >
              <button
                type="button"
                onClick={() => onSelectRegion(isActive ? null : region.id)}
                aria-pressed={isActive}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
                  {isEditing ? (
                    <input
                      autoFocus
                      value={draftLabel}
                      onChange={(event) => setDraftLabel(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          suppressBlurRef.current = true;
                          commitRename(region.id);
                        }
                        if (event.key === "Escape") {
                          suppressBlurRef.current = true;
                          setEditingId(null);
                        }
                      }}
                      onBlur={() => {
                        if (suppressBlurRef.current) {
                          suppressBlurRef.current = false;
                          return;
                        }
                        commitRename(region.id);
                      }}
                      className="w-full border border-skylight bg-white px-1 py-0.5 font-display text-sm font-bold tracking-tightest"
                    />
                  ) : (
                    <span className="block truncate font-display text-sm font-bold tracking-tightest">
                      {region.label}
                    </span>
                  )}
                  <span className="label-mono block text-graphite/70">
                    {hex ? hex.toUpperCase() : dict.studio.regionNoColorLabel}
                  </span>
                </span>
              </button>
              <button
                type="button"
                title={dict.studio.regionRenameLabel}
                aria-label={dict.studio.regionRenameLabel}
                onClick={() => {
                  setDraftLabel(region.label);
                  setEditingId(region.id);
                }}
                className="shrink-0 px-1 text-graphite/50 hover:text-graphite"
              >
                ✎
              </button>
              <button
                type="button"
                title={dict.studio.regionDeleteLabel}
                aria-label={dict.studio.regionDeleteLabel}
                onClick={() => onDeleteRegion(region.id)}
                className="shrink-0 px-1 text-graphite/50 hover:text-signal"
              >
                ✕
              </button>
            </div>
            {mergedLayers.length > 0 && (
              <ul className="ml-4 mt-1 space-y-1 border-l border-hairline-strong/60 pl-3">
                {mergedLayers.map((layer, index) => {
                  const layerHex = layer.color ? rgbToHex(layer.color) : null;
                  const isLast = index === mergedLayers.length - 1;
                  return (
                    <li key={layer.id} className="flex items-center gap-2 py-0.5">
                      <span className="h-5 w-7 shrink-0 overflow-hidden border border-graphite/15">
                        {layerHex ? (
                          <SwatchRamp hex={layerHex} steps={2} className="h-full" />
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
                      <span className="min-w-0 flex-1 truncate text-xs text-graphite/70">{layer.label}</span>
                      {isLast && (
                        <button
                          type="button"
                          title={dict.studio.regionUnmergeLabel}
                          aria-label={dict.studio.regionUnmergeLabel}
                          onClick={() => onUnmergeLastLayer(region.id)}
                          className="shrink-0 px-1 text-xs text-graphite/50 hover:text-graphite"
                        >
                          ↩
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
