import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SwatchRamp } from "@/components/SwatchRamp";
import { bergerYellowsOranges } from "@/data/palettes/berger-yellows-oranges";

// Matched on the Berger product code, not the display name: the name is copy and
// could be edited, the code is the stable key off the physical card.
const HERO_COLOR = bergerYellowsOranges.find((color) => color.code === "2T 0669")!;

const STEPS = [
  {
    title: "Photograph the wall",
    body: "Take a photo on your phone or drag one in from your computer. It never leaves your browser tab — there is no upload, no account, nothing stored.",
  },
  {
    title: "Click the surface",
    body: "One click picks up the wall, trim, or roof under your cursor. If it grabs too much or too little, move the sensitivity slider and click again.",
  },
  {
    title: "Choose a shade",
    body: "Pick from the Berger Yellows & Oranges card — facade, trims, and roofs — or open the color picker for anything else you have in mind.",
  },
  {
    title: "Download the preview",
    body: "Save the result as a PNG. Take it to the shop, show it to whoever else lives there, or hold it up against the actual wall.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteNav />

      <main>
        {/* Hero — the thesis is the ramp, not the headline. */}
        <section className="mx-auto max-w-shell px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
            <div>
              <p className="label-mono text-skylight">
                Berger Yellows &amp; Oranges · {bergerYellowsOranges.length} shades
              </p>
              <h1 className="mt-5 max-w-[15ch] font-display text-[2.75rem] font-extrabold leading-[0.92] tracking-tightest text-graphite sm:text-6xl lg:text-[4.25rem]">
                See the color on your wall, in your own light.
              </h1>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-graphite/75">
                Upload a photo of your house, click the surface you want to change, and pick a
                shade. Color Home swaps the pigment and leaves the photo&apos;s shadows, texture,
                and daylight exactly where they were.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-3 bg-graphite px-7 py-4 font-display text-sm font-bold uppercase tracking-[0.08em] text-chalk transition-colors hover:bg-skylight"
                >
                  Open the Studio
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/colors"
                  className="label-mono border-b border-graphite/30 pb-1 text-graphite/80 transition-colors hover:border-graphite hover:text-graphite"
                >
                  Browse the colors
                </Link>
              </div>
            </div>

            {/* Signature: one shade, carried across the values a real wall has. */}
            <figure className="border border-hairline-strong/60 bg-chalk p-5 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_18px_40px_-30px_rgba(0,0,0,0.75)] sm:p-7">
              <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-display text-lg font-bold tracking-tightest">
                  {HERO_COLOR.name}
                </span>
                <span className="label-mono text-graphite/70">{HERO_COLOR.code}</span>
              </figcaption>
              <div className="mt-5 h-44 sm:h-56">
                <SwatchRamp hex={HERO_COLOR.hex} steps={7} animate className="h-full" />
              </div>
              <div className="label-mono mt-3 flex items-center justify-between text-graphite/70">
                <span>In shade</span>
                <span className="mx-4 h-px flex-1 bg-hairline-strong" aria-hidden="true" />
                <span>In sun</span>
              </div>
              <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-graphite/70">
                One wall, seven times over. Every panel is the same paint — only the light falling
                on it changes. That range is what a photo of your house already contains, and it is
                what this tool keeps.
              </p>
            </figure>
          </div>
        </section>

        {/* How it works — a genuine sequence, so it is numbered like one. */}
        <section className="border-y border-hairline-strong/60 bg-chalk">
          <div className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-20">
            <h2 className="font-display text-3xl font-bold tracking-tightest sm:text-4xl">
              Four steps, about two minutes
            </h2>
            <ol className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="bg-chalk p-6">
                  <p className="label-mono text-skylight">
                    Step {index + 1} / {STEPS.length}
                  </p>
                  <h3 className="mt-4 font-display text-xl font-bold tracking-tightest">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-graphite/70">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The differentiator, shown rather than claimed. */}
        <section className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="label-mono text-skylight">The difference</p>
              <h2 className="mt-4 font-display text-3xl font-bold leading-[1.05] tracking-tightest sm:text-4xl">
                A paint bucket erases your house. This doesn&apos;t.
              </h2>
              <p className="mt-5 max-w-[48ch] leading-relaxed text-graphite/75">
                Fill a wall with a flat color and you lose the eave&apos;s shadow, the grain of the
                plaster, the corner where the light drops away — everything that told you it was
                your house. Color Home changes the pigment and keeps the brightness of every single
                pixel, so the wall stays lit the way it was when you took the picture.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <figure>
                <div
                  className="h-48 border border-hairline-strong/60"
                  style={{ backgroundColor: HERO_COLOR.hex }}
                  aria-hidden="true"
                />
                <figcaption className="mt-3">
                  <p className="label-mono text-graphite/70">Flat fill</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-graphite/70">
                    The shadow line under the eave is gone. So is the wall.
                  </p>
                </figcaption>
              </figure>
              <figure>
                <div
                  className="relative isolate h-48 overflow-hidden border border-hairline-strong/60"
                  aria-hidden="true"
                  style={{
                    backgroundImage:
                      "radial-gradient(120% 90% at 14% 6%, rgba(255,255,255,0.5), rgba(255,255,255,0) 58%), linear-gradient(168deg, #d2d2d2 0%, #b0b0b0 45%, #7e7e7e 46%, #676767 100%)",
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: HERO_COLOR.hex, mixBlendMode: "color" }}
                  />
                </div>
                <figcaption className="mt-3">
                  <p className="label-mono text-skylight">Color Home</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-graphite/70">
                    Same pigment, same shadow line. That is the whole trick.
                  </p>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="border-t border-hairline-strong/60 bg-graphite text-chalk">
          <div className="mx-auto flex max-w-shell flex-col items-start gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <h2 className="max-w-[20ch] font-display text-2xl font-bold leading-tight tracking-tightest sm:text-3xl">
              Try it on a photo of your own wall.
            </h2>
            {/* The global focus ring is graphite, which is invisible inside this dark
                band — swap it for chalk, which reads 16.25:1 against the band. */}
            <Link
              href="/studio"
              className="inline-flex items-center gap-3 bg-sun px-7 py-4 font-display text-sm font-bold uppercase tracking-[0.08em] text-graphite transition-colors hover:bg-chalk focus-visible:outline-chalk"
            >
              Open the Studio
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-shell px-5 py-12 sm:px-8">
        <p className="label-mono text-graphite/70">Before you order</p>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-graphite/70">
          A screen makes color out of light and paint makes it out of pigment, so a preview is a
          guide to the overall look rather than an exact match. The Berger shades here are visually
          estimated from a printed swatch card — check the physical ColorBank fandeck, and a real
          swatch in your own room&apos;s light, before you buy.
        </p>
      </footer>
    </div>
  );
}
