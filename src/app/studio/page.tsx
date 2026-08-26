"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { ColorStudio } from "@/components/ColorStudio";

export default function StudioPage() {
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Color Home Studio</h1>
      <p className="mb-6 text-sm text-slate-500">
        This preview is an approximation — actual paint color can vary with lighting, your
        screen's color calibration, and the wall's surface texture. Always confirm against a
        physical swatch before ordering paint.
      </p>
      {photo ? (
        <ColorStudio photo={photo} />
      ) : (
        <PhotoUploader onPhotoReady={setPhoto} />
      )}
    </main>
  );
}
