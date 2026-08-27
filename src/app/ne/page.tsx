import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SwatchRamp } from "@/components/SwatchRamp";
import { bergerYellowsOranges } from "@/data/palettes/berger-yellows-oranges";
import { getDictionary } from "@/lib/dictionary";
import { localeHref } from "@/lib/paths";

// Matched on the Berger product code, not the display name: the name is copy and
// could be edited, the code is the stable key off the physical card.
const HERO_COLOR = bergerYellowsOranges.find((color) => color.code === "2T 0669")!;

export default function NepaliHomePage() {
  const dict = getDictionary("ne");

  const STEPS = [
    { title: dict.landing.stepOneTitle, body: dict.landing.stepOneBody },
    { title: dict.landing.stepTwoTitle, body: dict.landing.stepTwoBody },
    { title: dict.landing.stepThreeTitle, body: dict.landing.stepThreeBody },
    { title: dict.landing.stepFourTitle, body: dict.landing.stepFourBody },
  ];

  return (
    <div className="min-h-screen">
      <SiteNav locale="ne" />

      <main>
        {/* Hero — the thesis is the ramp, not the headline. */}
        <section className="mx-auto max-w-shell px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
            <div>
              <p className="label-mono text-skylight">
                {dict.landing.heroEyebrowLabel} · {bergerYellowsOranges.length}{" "}
                {dict.landing.heroEyebrowShadesSuffix}
              </p>
              <h1 className="mt-5 max-w-[15ch] font-display text-[2.75rem] font-extrabold leading-[0.92] tracking-tightest text-graphite sm:text-6xl lg:text-[4.25rem]">
                {dict.landing.heroTitle}
              </h1>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-graphite/75">
                {dict.landing.heroSubtitle}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link
                  href={localeHref("ne", "/studio")}
                  className="inline-flex items-center gap-3 bg-graphite px-7 py-4 font-display text-sm font-bold uppercase tracking-[0.08em] text-chalk transition-colors hover:bg-skylight"
                >
                  {dict.landing.ctaPrimary}
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href={localeHref("ne", "/colors")}
                  className="label-mono border-b border-graphite/30 pb-1 text-graphite/80 transition-colors hover:border-graphite hover:text-graphite"
                >
                  {dict.landing.ctaSecondary}
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
                <span>{dict.landing.heroFigureInShade}</span>
                <span className="mx-4 h-px flex-1 bg-hairline-strong" aria-hidden="true" />
                <span>{dict.landing.heroFigureInSun}</span>
              </div>
              <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-graphite/70">
                {dict.landing.heroFigureCaption}
              </p>
            </figure>
          </div>
        </section>

        {/* How it works — a genuine sequence, so it is numbered like one. */}
        <section className="border-y border-hairline-strong/60 bg-chalk">
          <div className="mx-auto max-w-shell px-5 py-16 sm:px-8 sm:py-20">
            <h2 className="font-display text-3xl font-bold tracking-tightest sm:text-4xl">
              {dict.landing.stepsHeading}
            </h2>
            <ol className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="bg-chalk p-6">
                  <p className="label-mono text-skylight">
                    {dict.landing.stepCounterLabel} {index + 1} / {STEPS.length}
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
              <p className="label-mono text-skylight">{dict.landing.differenceEyebrow}</p>
              <h2 className="mt-4 font-display text-3xl font-bold leading-[1.05] tracking-tightest sm:text-4xl">
                {dict.landing.differenceTitle}
              </h2>
              <p className="mt-5 max-w-[48ch] leading-relaxed text-graphite/75">
                {dict.landing.differenceBody}
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
                  <p className="label-mono text-graphite/70">{dict.landing.differenceFlatFillLabel}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-graphite/70">
                    {dict.landing.differenceFlatFillCaption}
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
                  <p className="label-mono text-skylight">{dict.landing.differenceColorHomeLabel}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-graphite/70">
                    {dict.landing.differenceColorHomeCaption}
                  </p>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="border-t border-hairline-strong/60 bg-graphite text-chalk">
          <div className="mx-auto flex max-w-shell flex-col items-start gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <h2 className="max-w-[20ch] font-display text-2xl font-bold leading-tight tracking-tightest sm:text-3xl">
              {dict.landing.closingTitle}
            </h2>
            {/* The global focus ring is graphite, which is invisible inside this dark
                band — swap it for chalk, which reads 16.25:1 against the band. */}
            <Link
              href={localeHref("ne", "/studio")}
              className="inline-flex items-center gap-3 bg-sun px-7 py-4 font-display text-sm font-bold uppercase tracking-[0.08em] text-graphite transition-colors hover:bg-chalk focus-visible:outline-chalk"
            >
              {dict.landing.closingCta}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-shell px-5 py-12 sm:px-8">
        <p className="label-mono text-graphite/70">{dict.landing.footerEyebrow}</p>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-graphite/70">
          {dict.landing.footerBody}
        </p>
      </footer>
    </div>
  );
}
