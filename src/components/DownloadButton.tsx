"use client";

import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/dictionaries/types";

export function DownloadButton({
  canvasRef,
  locale,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  locale: Locale;
}) {
  const dict = getDictionary(locale);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "color-home-preview.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="flex w-full items-center justify-center gap-3 bg-graphite px-5 py-4 font-display text-sm font-bold uppercase tracking-[0.08em] text-chalk transition-colors hover:bg-skylight"
    >
      {dict.studio.downloadButtonLabel}
      <span aria-hidden="true">↓</span>
    </button>
  );
}
