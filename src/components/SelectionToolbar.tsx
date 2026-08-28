"use client";

import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/dictionaries/types";
import { DownloadButton } from "./DownloadButton";

export type SelectionTool = "magicWand" | "lasso" | "polygonLasso" | "brush" | "eraser" | "hand";

export function SelectionToolbar({
  activeTool,
  onSelectTool,
  locale,
  borderCheckboxVisible,
  borderEnabled,
  onToggleBorder,
  canvasRef,
}: {
  activeTool: SelectionTool;
  onSelectTool: (tool: SelectionTool) => void;
  locale: Locale;
  borderCheckboxVisible: boolean;
  borderEnabled: boolean;
  onToggleBorder: (checked: boolean) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const dict = getDictionary(locale);
  const tools: Array<{ id: SelectionTool; label: string; glyph: string }> = [
    { id: "magicWand", label: dict.studio.toolMagicWandLabel, glyph: "✨" },
    { id: "lasso", label: dict.studio.toolLassoLabel, glyph: "◌" },
    { id: "polygonLasso", label: dict.studio.toolPolygonLassoLabel, glyph: "⬠" },
    { id: "brush", label: dict.studio.toolBrushLabel, glyph: "●" },
    { id: "eraser", label: dict.studio.toolEraserLabel, glyph: "⌫" },
    { id: "hand", label: dict.studio.toolHandLabel, glyph: "✋" },
  ];

  return (
    <div className="flex flex-col gap-1 border-l border-hairline pl-2">
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
      {borderCheckboxVisible && (
        <>
          <div className="my-1 border-t border-hairline" />
          <button
            type="button"
            title={dict.studio.borderCheckboxLabel}
            aria-label={dict.studio.borderCheckboxLabel}
            aria-pressed={borderEnabled}
            onClick={() => onToggleBorder(!borderEnabled)}
            className={
              borderEnabled
                ? "flex h-9 w-9 items-center justify-center border border-skylight bg-skylight/10 text-lg"
                : "flex h-9 w-9 items-center justify-center border border-transparent text-lg text-graphite/60 hover:border-hairline-strong"
            }
          >
            ▢
          </button>
        </>
      )}
      <div className="my-1 border-t border-hairline" />
      <DownloadButton canvasRef={canvasRef} locale={locale} />
    </div>
  );
}
