export interface Point {
  x: number;
  y: number;
}

// Standard scanline point-in-polygon fill, using the nonzero winding rule:
// for each row, find where the polygon's edges cross that row's horizontal
// center line, sort the crossings, and fill spans where the running winding
// count is non-zero.
//
// Nonzero winding (not even-odd) is required here because the polygon can
// come from a freehand Lasso path, which commonly crosses itself when a
// user's hand isn't perfectly steady. Under even-odd, the doubly-enclosed
// area where the path crosses itself would be incorrectly excluded from the
// mask (an unexplained hole/notch in the middle of the selection) — nonzero
// winding correctly treats a self-intersecting loop's inner area as still
// "inside".
export function polygonToMask(points: Point[], width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (points.length < 3) return mask;

  for (let y = 0; y < height; y++) {
    const scanY = y + 0.5;
    // Each crossing carries a direction: +1 if the edge goes downward
    // through the scanline, -1 if upward — nonzero winding rule, correct
    // for a freehand path that can cross itself (even-odd would incorrectly
    // punch a hole where the path re-enters its own loop).
    const crossings: Array<{ x: number; direction: number }> = [];

    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if (a.y === b.y) continue; // horizontal edges never cross a scanline
      if ((scanY >= a.y && scanY < b.y) || (scanY >= b.y && scanY < a.y)) {
        const t = (scanY - a.y) / (b.y - a.y);
        crossings.push({ x: a.x + t * (b.x - a.x), direction: b.y > a.y ? 1 : -1 });
      }
    }

    crossings.sort((c1, c2) => c1.x - c2.x);

    let winding = 0;
    for (let i = 0; i + 1 < crossings.length; i++) {
      winding += crossings[i].direction;
      if (winding !== 0) {
        const xStart = Math.max(0, Math.ceil(crossings[i].x - 0.5));
        const xEnd = Math.min(width - 1, Math.floor(crossings[i + 1].x - 0.5));
        for (let x = xStart; x <= xEnd; x++) {
          mask[y * width + x] = 1;
        }
      }
    }
  }

  return mask;
}
