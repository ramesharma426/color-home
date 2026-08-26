export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface PixelBuffer {
  data: Uint8ClampedArray; // RGBA, length === width * height * 4
  width: number;
  height: number;
}
