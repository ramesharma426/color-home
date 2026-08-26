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

    const rawBitmap = await createImageBitmap(file);
    const { width, height } = fitWithinMax(rawBitmap.width, rawBitmap.height, MAX_DIMENSION);
    const resizedBitmap = await createImageBitmap(rawBitmap, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
    });
    onPhotoReady(resizedBitmap);
  }

  return (
    <div
      className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <p className="mb-4 text-slate-600">
        Drag a photo here, or take one with your phone.
      </p>
      <button
        type="button"
        className="rounded-lg bg-slate-900 px-4 py-2 text-white"
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
          if (file) handleFile(file);
        }}
      />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
