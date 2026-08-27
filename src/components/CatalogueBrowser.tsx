"use client";

import { useMemo, useState } from "react";
import type { CatalogueColor, PaintBrand } from "@/data/palettes/types";
import type { RGBColor } from "@/lib/canvas/types";
import { hexToRgb } from "@/lib/canvas/colorMath";
import { bergerCatalogue, bergerCategories } from "@/data/palettes/berger-catalogue";
import { asianPaintsCatalogue, asianPaintsCategories } from "@/data/palettes/asian-paints-catalogue";

const BRANDS: { id: PaintBrand; label: string; colors: CatalogueColor[]; categories: string[] }[] = [
  { id: "berger", label: "Berger", colors: bergerCatalogue, categories: bergerCategories },
  { id: "asian-paints", label: "Asian Paints", colors: asianPaintsCatalogue, categories: asianPaintsCategories },
];

/**
 * `onSelect` is optional: when omitted (the standalone /colors page), swatches
 * are just displayed. When provided (reused by the Studio's PaletteBrowser in
 * a later task), clicking a swatch calls onSelect with its RGBColor instead of
 * only displaying it — this is why the component takes an optional prop here
 * rather than being forked into two near-identical components later.
 *
 * Internal copy (search placeholder, empty states, brand names) is
 * deliberately plain English literals, not wired into the Dictionary/
 * getDictionary system — that translation work is out of scope for now.
 */
export function CatalogueBrowser({
  onSelect,
  disabled = false,
}: {
  onSelect?: (color: RGBColor) => void;
  disabled?: boolean;
} = {}) {
  const [brandId, setBrandId] = useState<PaintBrand>("berger");
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const brand = BRANDS.find((b) => b.id === brandId)!;

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query) {
      return brand.colors.filter(
        (c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
      );
    }
    if (category) {
      return brand.colors.filter((c) => c.category === category);
    }
    return [];
  }, [brand, category, search]);

  function handleBrandChange(next: PaintBrand) {
    setBrandId(next);
    setCategory(null);
    setSearch("");
  }

  return (
    <div className={disabled ? "opacity-50" : undefined}>
      <div role="tablist" aria-label="Paint brand" className="mb-6 flex gap-2">
        {BRANDS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={b.id === brandId}
            onClick={() => handleBrandChange(b.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              b.id === brandId
                ? "border-graphite bg-graphite text-chalk"
                : "border-hairline-strong text-graphite/70 hover:border-graphite/50"
            }`}
          >
            {b.label} <span className="text-xs opacity-70">({b.colors.length})</span>
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setCategory(null);
        }}
        placeholder={`Search ${brand.label} colors by name or code…`}
        className="mb-6 w-full rounded-lg border border-hairline-strong bg-chalk px-4 py-2 text-sm text-graphite placeholder:text-graphite/50 focus:border-skylight focus:outline-none"
      />

      {!search && (
        <div className="mb-6 flex flex-wrap gap-2">
          {brand.categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat === category ? null : cat)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                cat === category
                  ? "border-graphite bg-graphite text-chalk"
                  : "border-hairline-strong text-graphite/70 hover:border-graphite/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {results.length === 0 ? (
        <p className="text-sm text-graphite/60">
          {search || category
            ? "No colors matched. Try a different name, code, or family."
            : "Search by name or code, or pick a shade family above, to browse."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {results.map((color) => {
            const swatch = (
              <>
                <div className="h-16" style={{ backgroundColor: color.hex }} />
                <div className="border-t border-hairline p-2">
                  <p className="truncate text-sm font-medium">{color.name}</p>
                  <p className="label-mono text-graphite/70">{color.code}</p>
                </div>
              </>
            );
            const className =
              "overflow-hidden rounded-lg border border-hairline-strong bg-chalk text-left transition-colors hover:border-graphite/50";
            return onSelect ? (
              <button
                key={`${color.name}-${color.code}`}
                type="button"
                title={`${color.name} — ${color.code}`}
                onClick={() => {
                  if (!disabled) onSelect(hexToRgb(color.hex));
                }}
                className={className}
              >
                {swatch}
              </button>
            ) : (
              <div key={`${color.name}-${color.code}`} className={className}>
                {swatch}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs leading-relaxed text-graphite/60">
        Swatches are rendered from each brand&rsquo;s published colour values, but how they look still depends on
        your screen — confirm against a physical fandeck or sample pot before painting.
      </p>
    </div>
  );
}
