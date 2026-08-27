export interface Point {
  x: number;
  y: number;
}

// Standard scanline point-in-polygon fill (even-odd rule): for each row,
// find where the polygon's edges cross that row's horizontal center line,
// sort the crossings, and fill between each pair.
export function polygonToMask(points: Point[], width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (points.length < 3) return mask;

  for (let y = 0; y < height; y++) {
    const scanY = y + 0.5;
    const intersections: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if (a.y === b.y) continue; // horizontal edges never cross a scanline
      if ((scanY >= a.y && scanY < b.y) || (scanY >= b.y && scanY < a.y)) {
        const t = (scanY - a.y) / (b.y - a.y);
        intersections.push(a.x + t * (b.x - a.x));
      }
    }

    intersections.sort((x1, x2) => x1 - x2);

    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const xStart = Math.max(0, Math.ceil(intersections[i] - 0.5));
      const xEnd = Math.min(width - 1, Math.floor(intersections[i + 1] - 0.5));
      for (let x = xStart; x <= xEnd; x++) {
        mask[y * width + x] = 1;
      }
    }
  }

  return mask;
}
