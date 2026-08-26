import Link from "next/link";

/**
 * Shared masthead. Deliberately thin and neutral: the paint is the only thing
 * on any of these pages allowed to carry colour, apart from the single sun
 * chip in the wordmark.
 */
export function SiteNav() {
  return (
    <header className="border-b border-hairline-strong/70">
      <nav className="mx-auto flex max-w-shell items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-display text-[0.95rem] font-extrabold uppercase tracking-tightest text-graphite"
        >
          <span className="h-3.5 w-3.5 bg-sun transition-transform duration-300 group-hover:rotate-45" />
          Color Home
        </Link>
        <div className="label-mono flex items-center gap-5 text-graphite/70">
          <Link href="/studio" className="transition-colors hover:text-graphite">
            Studio
          </Link>
          <Link href="/colors" className="transition-colors hover:text-graphite">
            Colors
          </Link>
        </div>
      </nav>
    </header>
  );
}
