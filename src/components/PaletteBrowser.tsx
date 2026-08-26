"use client";

import { bergerYellowsOranges } from "@/data/palettes/berger-yellows-oranges";
import { hexToRgb } from "@/lib/canvas/colorMath";
import type { RGBColor } from "@/lib/canvas/types";

const CATEGORY_LABELS: Record<string, string> = {
  facade: "Facade",
  trim: "Trims",
  roof: "Roofs",
};

export function PaletteBrowser({
  onSelect,
  disabled = false,
}: {
  onSelect: (color: RGBColor) => void;
  disabled?: boolean;
}) {
  const categories = ["facade", "trim", "roof"] as const;

  return (
    <div>
      {disabled && (
        <p className="label-mono mb-3 text-graphite/70">Pick a surface first</p>
      )}
      <div className={disabled ? "opacity-50" : undefined}>
        {categories.map((category) => (
          <div key={category} className="mb-5">
            <h3 className="label-mono mb-2 text-graphite/70">{CATEGORY_LABELS[category]}</h3>
            <div className="grid grid-cols-6 gap-1.5">
              {bergerYellowsOranges
                .filter((color) => color.category === category)
                .map((color) => (
                  <button
                    key={color.code}
                    type="button"
                    title={`${color.name} — ${color.code}`}
                    aria-label={`${color.name}, ${color.code}`}
                    disabled={disabled}
                    onClick={() => onSelect(hexToRgb(color.hex))}
                    className="aspect-square border border-graphite/15 transition-transform duration-150 hover:-translate-y-0.5 hover:border-graphite/50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
            </div>
          </div>
        ))}
        <label className="flex items-center gap-3 border-t border-hairline-strong/60 pt-4 text-sm text-graphite/70">
          <span>Or pick any color</span>
          <input
            type="color"
            disabled={disabled}
            onChange={(event) => onSelect(hexToRgb(event.target.value))}
            className="h-8 w-12 align-middle"
          />
        </label>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-graphite/75">
        Berger colors shown are visually estimated from a printed swatch card — confirm against
        the physical fandeck before ordering paint.
      </p>
    </div>
  );
}
