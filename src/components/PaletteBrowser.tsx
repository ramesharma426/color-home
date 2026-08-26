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
    <div className={disabled ? "opacity-50" : undefined}>
      <p className="mb-2 text-xs text-slate-500">
        Berger colors shown are visually estimated from a printed swatch card — confirm against
        the physical fandeck before ordering paint.
      </p>
      {categories.map((category) => (
        <div key={category} className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">{CATEGORY_LABELS[category]}</h3>
          <div className="grid grid-cols-6 gap-2">
            {bergerYellowsOranges
              .filter((color) => color.category === category)
              .map((color) => (
                <button
                  key={color.code}
                  type="button"
                  title={color.name}
                  disabled={disabled}
                  onClick={() => onSelect(hexToRgb(color.hex))}
                  className="aspect-square rounded-md border border-slate-200"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
          </div>
        </div>
      ))}
      <label className="mt-2 block text-sm text-slate-600">
        Or pick any color:
        <input
          type="color"
          disabled={disabled}
          onChange={(event) => onSelect(hexToRgb(event.target.value))}
          className="ml-2 h-8 w-12 align-middle"
        />
      </label>
    </div>
  );
}
