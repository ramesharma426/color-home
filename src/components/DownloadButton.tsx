"use client";

export function DownloadButton({
  canvasRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
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
      Download result
      <span aria-hidden="true">↓</span>
    </button>
  );
}
