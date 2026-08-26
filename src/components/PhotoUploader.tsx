"use client";

import { useRef, useState } from "react";
import { fitWithinMax } from "@/lib/image/downscale";

const MAX_DIMENSION = 1600;

export function PhotoUploader({
  onPhotoReady,
}: {
  onPhotoReady: (bitmap: ImageBitmap) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image. Please choose a photo.");
      return;
    }
    setError(null);

    try {
      const rawBitmap = await createImageBitmap(file);
      const { width, height } = fitWithinMax(rawBitmap.width, rawBitmap.height, MAX_DIMENSION);
      const resizedBitmap = await createImageBitmap(rawBitmap, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "high",
      });
      rawBitmap.close();
      onPhotoReady(resizedBitmap);
    } catch (err) {
      setError("Couldn't read that image — try a different photo.");
    }
  }

  return (
    <div
      className="flex min-h-[22rem] flex-col items-center justify-center border border-dashed border-hairline-strong bg-chalk px-6 py-16 text-center transition-colors hover:border-skylight"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <span className="label-mono text-skylight">Step 1 of 3</span>
      <p className="mt-4 max-w-[30ch] font-display text-2xl font-bold leading-tight tracking-tightest text-graphite">
        Drag a photo here, or take one with your phone.
      </p>
      <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-graphite/65">
        Your photo stays in this browser tab. Nothing is uploaded, saved, or sent anywhere.
      </p>
      <button
        type="button"
        className="mt-8 bg-graphite px-7 py-4 font-display text-sm font-bold uppercase tracking-[0.08em] text-chalk transition-colors hover:bg-skylight"
        onClick={() => inputRef.current?.click()}
      >
        Choose a photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            handleFile(file);
            event.target.value = "";
          }
        }}
      />
      {error && (
        <p
          role="status"
          className="mt-6 border-l-2 border-signal pl-3 text-left text-sm font-medium text-signal"
        >
          {error}
        </p>
      )}
    </div>
  );
}
