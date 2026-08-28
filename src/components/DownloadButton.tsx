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
      title={dict.studio.downloadButtonLabel}
      aria-label={dict.studio.downloadButtonLabel}
      onClick={handleDownload}
      className="flex h-9 w-9 items-center justify-center border border-transparent text-lg text-graphite/60 hover:border-hairline-strong"
    >
      ↓
    </button>
  );
}
