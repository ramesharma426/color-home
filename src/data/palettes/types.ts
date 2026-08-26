export type PaintCategory = "facade" | "trim" | "roof";

export interface PaintColor {
  name: string;
  code: string;
  hex: string;
  category: PaintCategory;
}
