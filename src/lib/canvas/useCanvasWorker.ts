"use client";

import { useEffect, useRef } from "react";
import type { PixelBuffer, RGBColor } from "./types";

type PendingResolver = (value: any) => void;

export function useCanvasWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingResolver>>(new Map());

  useEffect(() => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent) => {
      const { id, ...result } = event.data;
      const resolve = pendingRef.current.get(id);
      if (resolve) {
        resolve(result);
        pendingRef.current.delete(id);
      }
    };
    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  function send<T>(request: object): Promise<T> {
    const worker = workerRef.current;
    if (!worker) {
      throw new Error("Canvas worker is not ready yet");
    }
    const id = crypto.randomUUID();
    return new Promise<T>((resolve) => {
      pendingRef.current.set(id, resolve);
      worker.postMessage({ id, ...request });
    });
  }

  async function runFloodFill(
    buffer: PixelBuffer,
    seedX: number,
    seedY: number,
    tolerance: number
  ): Promise<Uint8Array> {
    const result = await send<{ mask: Uint8Array }>({
      type: "floodFill",
      buffer,
      seedX,
      seedY,
      tolerance,
    });
    return result.mask;
  }

  async function runRecolor(
    buffer: PixelBuffer,
    mask: Uint8Array,
    targetColor: RGBColor
  ): Promise<PixelBuffer> {
    const result = await send<{ buffer: PixelBuffer }>({
      type: "recolor",
      buffer,
      mask,
      targetColor,
    });
    return result.buffer;
  }

  return { runFloodFill, runRecolor };
}
