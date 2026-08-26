function erode(mask: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (!mask[index]) continue;

      const neighbors: Array<[number, number]> = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];

      const allNeighborsInside = neighbors.every(([nx, ny]) => {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;
        return mask[ny * width + nx] === 1;
      });

      result[index] = allNeighborsInside ? 1 : 0;
    }
  }

  return result;
}

export function computeBorderMask(
  mask: Uint8Array,
  width: number,
  height: number,
  thickness: number
): Uint8Array {
  let eroded = mask;
  for (let i = 0; i < thickness; i++) {
    eroded = erode(eroded, width, height);
  }

  const border = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    border[i] = mask[i] && !eroded[i] ? 1 : 0;
  }
  return border;
}
