import { SiteNav } from "@/components/SiteNav";
import { CatalogueBrowser } from "@/components/CatalogueBrowser";
import { getDictionary } from "@/lib/dictionary";

export default function ColorsPage() {
  const dict = getDictionary("en");

  return (
    <div className="min-h-screen">
      <SiteNav locale="en" />

      <main className="mx-auto max-w-shell px-5 py-10 sm:px-8">
        <p className="label-mono text-skylight">{dict.colors.eyebrow}</p>
        <h1 className="mt-3 max-w-[20ch] font-display text-4xl font-extrabold leading-[0.95] tracking-tightest sm:text-5xl">
          {dict.colors.pageTitle}
        </h1>
        <p className="mt-5 max-w-[60ch] leading-relaxed text-graphite/75">{dict.colors.subtitle}</p>

        <div className="mt-10">
          <CatalogueBrowser />
        </div>
      </main>
    </div>
  );
}
