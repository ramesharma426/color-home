export type PaintCategory = "facade" | "trim" | "roof";

export interface PaintColor {
  name: string;
  code: string;
  hex: string;
  category: PaintCategory;
}

export type PaintBrand = "berger" | "asian-paints";

/**
 * A color from a full brand catalogue (Berger's official site, Asian Paints'
 * shade card). Unlike `PaintColor` above, `category` here is a brand-specific
 * hue-family label (e.g. "Red", "Beige and Brown") rather than a fixed
 * facade/trim/roof union — the two brands' own catalogues don't share a
 * category scheme, so this is intentionally a plain string, not a union type.
 */
export interface CatalogueColor {
  name: string;
  code: string;
  hex: string;
  category: string;
}
