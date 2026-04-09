import Link from "next/link";

import { getAllModelComparisons } from "@/lib/content";

export const metadata = {
  title: "LLM Comparisons",
  description: "Programmatic comparison pages for leading AI models, providers, and use cases.",
};

export default async function CompareIndexPage() {
  const comparisons = await getAllModelComparisons();

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Compare</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">LLM comparison library</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          Structured head-to-head pages designed for pricing, benchmark, and use-case research.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {comparisons.map((comparison) => (
          <Link
            key={comparison.slug}
            href={`/compare/${comparison.slug}`}
            className="surface-card group space-y-3 transition hover:-translate-y-0.5 hover:border-white/16"
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{comparison.category}</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-50 group-hover:text-sky-200">
              {comparison.title}
            </h2>
            <p className="text-sm leading-6 text-slate-300">{comparison.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
