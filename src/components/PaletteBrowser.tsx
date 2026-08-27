"use client";

import { bergerYellowsOranges } from "@/data/palettes/berger-yellows-oranges";
import { hexToRgb } from "@/lib/canvas/colorMath";
import type { RGBColor } from "@/lib/canvas/types";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/dictionaries/types";
import { CatalogueBrowser } from "./CatalogueBrowser";

export function PaletteBrowser({
  onSelect,
  disabled = false,
  locale,
}: {
  onSelect: (color: RGBColor) => void;
  disabled?: boolean;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const categories = ["facade", "trim", "roof"] as const;
  const categoryLabels: Record<string, string> = {
    facade: dict.studio.categoryFacade,
    trim: dict.studio.categoryTrim,
    roof: dict.studio.categoryRoof,
  };

  return (
    <div>
      {disabled && (
        <p className="label-mono mb-3 text-graphite/70">{dict.studio.paletteDisabledMessage}</p>
      )}
      <div className={disabled ? "opacity-50" : undefined}>
        {categories.map((category) => (
          <div key={category} className="mb-5">
            <h3 className="label-mono mb-2 text-graphite/70">{categoryLabels[category]}</h3>
            <div className="grid grid-cols-6 gap-1.5">
              {bergerYellowsOranges
                .filter((color) => color.category === category)
                .map((color) => (
                  <button
                    key={color.code}
                    type="button"
                    title={`${color.name} — ${color.code}`}
                    aria-label={`${color.name}, ${color.code}`}
                    onClick={() => {
                      if (!disabled) onSelect(hexToRgb(color.hex));
                    }}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        "application/x-color-rgb",
                        JSON.stringify(hexToRgb(color.hex))
                      );
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    className="aspect-square border border-graphite/15 transition-transform duration-150 hover:-translate-y-0.5 hover:border-graphite/50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
            </div>
          </div>
        ))}
        <label className="flex items-center gap-3 border-t border-hairline-strong/60 pt-4 text-sm text-graphite/70">
          <span>{dict.studio.pickAnyColorLabel}</span>
          <input
            type="color"
            disabled={disabled}
            onChange={(event) => onSelect(hexToRgb(event.target.value))}
            className="h-8 w-12 align-middle"
          />
        </label>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-graphite/75">{dict.studio.paletteCaveat}</p>
      <div className="mt-6 border-t border-hairline-strong/60 pt-4">
        <p className="mb-3 text-sm font-semibold text-graphite/70">Browse the full catalog</p>
        <CatalogueBrowser onSelect={onSelect} disabled={disabled} />
      </div>
    </div>
  );
}
