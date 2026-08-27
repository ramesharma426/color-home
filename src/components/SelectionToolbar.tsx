"use client";

import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/dictionaries/types";

export type SelectionTool = "magicWand" | "lasso" | "polygonLasso" | "brush" | "hand";

export function SelectionToolbar({
  activeTool,
  onSelectTool,
  locale,
}: {
  activeTool: SelectionTool;
  onSelectTool: (tool: SelectionTool) => void;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const tools: Array<{ id: SelectionTool; label: string; glyph: string }> = [
    { id: "magicWand", label: dict.studio.toolMagicWandLabel, glyph: "✨" },
    { id: "lasso", label: dict.studio.toolLassoLabel, glyph: "◌" },
    { id: "polygonLasso", label: dict.studio.toolPolygonLassoLabel, glyph: "⬠" },
    { id: "brush", label: dict.studio.toolBrushLabel, glyph: "●" },
    { id: "hand", label: dict.studio.toolHandLabel, glyph: "✋" },
  ];

  return (
    <div className="flex flex-col gap-1 border-r border-hairline pr-2">
      {tools.map((tool) => (
        <button
          key={tool.id}
          type="button"
          title={tool.label}
          aria-label={tool.label}
          aria-pressed={activeTool === tool.id}
          onClick={() => onSelectTool(tool.id)}
          className={
            activeTool === tool.id
              ? "flex h-9 w-9 items-center justify-center border border-skylight bg-skylight/10 text-lg"
              : "flex h-9 w-9 items-center justify-center border border-transparent text-lg text-graphite/60 hover:border-hairline-strong"
          }
        >
          {tool.glyph}
        </button>
      ))}
    </div>
  );
}
