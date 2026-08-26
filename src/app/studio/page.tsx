"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { ColorStudio } from "@/components/ColorStudio";
import { SiteNav } from "@/components/SiteNav";

export default function StudioPage() {
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);

  return (
    <div className="min-h-screen">
      <SiteNav />

      <main className="mx-auto max-w-shell px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="label-mono text-skylight">Studio</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tightest sm:text-4xl">
              Your photo, your paint
            </h1>
          </div>
          <p className="max-w-[42ch] text-sm leading-relaxed text-graphite/70">
            {photo
              ? "Click a surface in the photo to select it, then give it a color. Add as many surfaces as you like."
              : "Start with a photo of the wall, trim, or roof you are thinking about repainting."}
          </p>
        </div>

        <div className={photo ? "mt-8" : "mx-auto mt-8 max-w-3xl"}>
          {photo ? (
            <ColorStudio photo={photo} />
          ) : (
            <PhotoUploader onPhotoReady={setPhoto} />
          )}
        </div>

        {/* Preserved verbatim: customers need this before they order paint. */}
        <aside
          className={`border-t border-hairline-strong/60 pt-6 ${
            photo ? "mt-12" : "mx-auto mt-12 max-w-3xl"
          }`}
        >
          <p className="label-mono text-graphite/70">Why this is an approximation</p>
          <p className="mt-4 max-w-[80ch] text-sm leading-relaxed text-graphite/70">
            Screens make color by mixing glowing red, green, and blue light; paint makes color by
            reflecting light off pigment on a wall — the same color will never look perfectly
            identical between the two. Your monitor&apos;s calibration, the lighting this photo was
            taken in, and the lighting in your actual room all shift how a color reads as well.
            Treat this preview as a guide to the overall look, not an exact match — always confirm
            with a physical paint swatch in your own room&apos;s lighting before ordering.
          </p>
        </aside>
      </main>
    </div>
  );
}
