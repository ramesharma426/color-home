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
        Screens make color by mixing glowing red, green, and blue light; paint makes color by
        reflecting light off pigment on a wall — the same color will never look perfectly
        identical between the two. Your monitor's calibration, the lighting this photo was
        taken in, and the lighting in your actual room all shift how a color reads as well.
        Treat this preview as a guide to the overall look, not an exact match — always confirm
        with a physical paint swatch in your own room's lighting before ordering.
      </p>
      {photo ? (
        <ColorStudio photo={photo} />
      ) : (
        <PhotoUploader onPhotoReady={setPhoto} />
      )}
    </main>
  );
}
