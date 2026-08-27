import Link from "next/link";
import { bergerYellowsOranges } from "@/data/palettes/berger-yellows-oranges";
import { SiteNav } from "@/components/SiteNav";
import { SwatchRamp } from "@/components/SwatchRamp";
import { getDictionary } from "@/lib/dictionary";

export default function ColorsPage() {
  const dict = getDictionary("en");
  const categories = ["facade", "trim", "roof"] as const;
  const categoryLabels: Record<string, string> = {
    facade: dict.colors.categoryFacade,
    trim: dict.colors.categoryTrim,
    roof: dict.colors.categoryRoof,
  };
  const categoryNotes: Record<string, string> = {
    facade: dict.colors.categoryNoteFacade,
    trim: dict.colors.categoryNoteTrim,
    roof: dict.colors.categoryNoteRoof,
  };

  return (
    <div className="min-h-screen">
      <SiteNav locale="en" />

      <main className="mx-auto max-w-shell px-5 py-10 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end">
          <div>
            <p className="label-mono text-skylight">
              {dict.colors.eyebrowBrand} · {bergerYellowsOranges.length} {dict.colors.shadesSuffix}
            </p>
            <h1 className="mt-3 max-w-[16ch] font-display text-4xl font-extrabold leading-[0.95] tracking-tightest sm:text-5xl">
              {dict.colors.pageTitle}
            </h1>
            <p className="mt-5 max-w-[52ch] leading-relaxed text-graphite/75">
              {dict.colors.subtitle}
            </p>
            <Link
              href="/studio"
              className="mt-7 inline-flex items-center gap-3 bg-graphite px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.08em] text-chalk transition-colors hover:bg-skylight"
            >
              {dict.colors.ctaTryOnWall}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="border-l-2 border-skylight pl-4 text-sm leading-relaxed text-graphite/70">
            {dict.colors.caveat}
          </p>
        </div>

        {categories.map((category) => {
          const colors = bergerYellowsOranges.filter((color) => color.category === category);

          return (
            <section key={category} className="mt-14">
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-hairline-strong pb-3">
                <h2 className="font-display text-2xl font-bold tracking-tightest">
                  {categoryLabels[category]}
                </h2>
                <span className="label-mono text-graphite/70">
                  {colors.length} {dict.colors.shadesSuffix}
                </span>
                <p className="w-full text-sm text-graphite/75 sm:ml-auto sm:w-auto">
                  {categoryNotes[category]}
                </p>
              </div>

              <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {colors.map((color) => (
                  <li
                    key={color.code}
                    className="group overflow-hidden border border-hairline-strong/60 bg-chalk transition-colors hover:border-graphite/50"
                  >
                    <div className="h-24 sm:h-28">
                      <SwatchRamp hex={color.hex} steps={5} className="h-full" />
                    </div>
                    <div className="flex flex-col gap-1 border-t border-hairline px-3 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                      <p className="min-w-0 font-display text-sm font-bold leading-tight tracking-tightest">
                        {color.name}
                      </p>
                      <p className="label-mono shrink-0 text-graphite/70">{color.code}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
}
