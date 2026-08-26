import { floodFill } from "./floodFill";
import { recolor } from "./recolor";
import type { PixelBuffer, RGBColor } from "./types";

type FloodFillRequest = {
  id: string;
  type: "floodFill";
  buffer: PixelBuffer;
  seedX: number;
  seedY: number;
  tolerance: number;
};

type RecolorRequest = {
  id: string;
  type: "recolor";
  buffer: PixelBuffer;
  mask: Uint8Array;
  targetColor: RGBColor;
};

type WorkerRequest = FloodFillRequest | RecolorRequest;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === "floodFill") {
    const mask = floodFill(request.buffer, request.seedX, request.seedY, request.tolerance);
    self.postMessage({ id: request.id, type: "floodFillResult", mask });
    return;
  }

  if (request.type === "recolor") {
    const buffer = recolor(request.buffer, request.mask, request.targetColor);
    self.postMessage({ id: request.id, type: "recolorResult", buffer });
    return;
  }
};
