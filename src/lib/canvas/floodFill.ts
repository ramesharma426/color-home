import type { PixelBuffer } from "./types";

export function floodFill(
  buffer: PixelBuffer,
  seedX: number,
  seedY: number,
  tolerance: number
): Uint8Array {
  const { data, width, height } = buffer;

  if (seedX < 0 || seedX >= width || seedY < 0 || seedY >= height) {
    throw new RangeError(
      `Seed point (${seedX}, ${seedY}) is outside the ${width}x${height} buffer`
    );
  }

  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const toleranceSquared = tolerance * tolerance;

  const pixelAt = (index: number) => {
    const offset = index * 4;
    return { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
  };

  const seedIndex = seedY * width + seedX;
  const seedColor = pixelAt(seedIndex);

  const withinTolerance = (index: number) => {
    const { r, g, b } = pixelAt(index);
    const dr = r - seedColor.r;
    const dg = g - seedColor.g;
    const db = b - seedColor.b;
    return dr * dr + dg * dg + db * db <= toleranceSquared;
  };

  const stack: number[] = [seedIndex];
  visited[seedIndex] = 1;

  while (stack.length > 0) {
    const index = stack.pop()!;
    if (!withinTolerance(index)) continue;

    mask[index] = 1;
    const x = index % width;
    const y = Math.floor(index / width);

    const neighbors: Array<[number, number]> = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const neighborIndex = ny * width + nx;
      if (visited[neighborIndex]) continue;
      visited[neighborIndex] = 1;
      stack.push(neighborIndex);
    }
  }

  return mask;
}
