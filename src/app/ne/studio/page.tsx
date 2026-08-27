"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { ColorStudio } from "@/components/ColorStudio";
import { SiteNav } from "@/components/SiteNav";
import { getDictionary } from "@/lib/dictionary";

export default function NepaliStudioPage() {
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  const dict = getDictionary("ne");

  return (
    <div className="min-h-screen">
      <SiteNav locale="ne" />

      <main className="mx-auto max-w-[90rem] px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="label-mono text-skylight">{dict.studio.eyebrow}</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tightest sm:text-4xl">
              {dict.studio.pageTitle}
            </h1>
          </div>
          <p className="max-w-[42ch] text-sm leading-relaxed text-graphite/70">
            {photo ? dict.studio.introWithPhoto : dict.studio.introWithoutPhoto}
          </p>
        </div>

        <div className={photo ? "mt-8" : "mx-auto mt-8 max-w-3xl"}>
          {photo ? (
            <ColorStudio photo={photo} locale="ne" />
          ) : (
            <PhotoUploader onPhotoReady={setPhoto} locale="ne" />
          )}
        </div>

        {/* Preserved verbatim: customers need this before they order paint. */}
        <aside
          className={`border-t border-hairline-strong/60 pt-6 ${
            photo ? "mt-12" : "mx-auto mt-12 max-w-3xl"
          }`}
        >
          <p className="label-mono text-graphite/70">{dict.studio.disclaimerEyebrow}</p>
          <p className="mt-4 max-w-[80ch] text-sm leading-relaxed text-graphite/70">
            {dict.studio.disclaimer}
          </p>
        </aside>
      </main>
    </div>
  );
}
