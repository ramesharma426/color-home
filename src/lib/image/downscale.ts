export function fitWithinMax(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}
