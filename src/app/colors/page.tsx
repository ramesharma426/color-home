import { bergerYellowsOranges } from "@/data/palettes/berger-yellows-oranges";

const CATEGORY_LABELS: Record<string, string> = {
  facade: "Facade",
  trim: "Trims",
  roof: "Roofs",
};

export default function ColorsPage() {
  const categories = ["facade", "trim", "roof"] as const;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-semibold">Berger Yellows & Oranges</h1>
      <p className="mb-6 text-sm text-slate-500">
        Colors shown are visually estimated from a printed swatch card — confirm against the
        physical Berger ColorBank fandeck before ordering paint.
      </p>
      {categories.map((category) => (
        <section key={category} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">{CATEGORY_LABELS[category]}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {bergerYellowsOranges
              .filter((color) => color.category === category)
              .map((color) => (
                <div key={color.code} className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="h-20" style={{ backgroundColor: color.hex }} />
                  <div className="p-2">
                    <p className="text-sm font-medium">{color.name}</p>
                    <p className="text-xs text-slate-500">{color.code}</p>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </main>
  );
}
