import type { Point } from "./polygonMask";

function stampCircle(mask: Uint8Array, width: number, height: number, cx: number, cy: number, radius: number) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));
  const radiusSquared = radius * radius;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= radiusSquared) {
        mask[y * width + x] = 1;
      }
    }
  }
}

// Unions filled circles along a pointer path into a mask. Interpolates
// between consecutive points at roughly radius/2 spacing so a fast drag
// (which fires far fewer pointermove events than pixels crossed) doesn't
// leave gaps in the stroke.
export function paintBrushStroke(
  existingMask: Uint8Array,
  width: number,
  height: number,
  points: Point[],
  radius: number
): Uint8Array {
  const mask = new Uint8Array(existingMask);
  if (points.length === 0) return mask;

  stampCircle(mask, width, height, points[0].x, points[0].y, radius);

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius / 2)));
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      stampCircle(mask, width, height, a.x + t * (b.x - a.x), a.y + t * (b.y - a.y), radius);
    }
  }

  return mask;
}
