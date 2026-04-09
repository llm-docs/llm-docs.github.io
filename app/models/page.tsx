import Link from "next/link";

import { getModels } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

function formatDate(date: string) {
  if (!date) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export const metadata = buildPageMetadata({
  title: "Models | LLM-Docs",
  description: "Track language models, releases, context windows, and provider updates.",
  path: "/models",
});

export default async function ModelsIndexPage() {
  const models = await getModels();

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Models</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Model tracker</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          Use frontmatter in `content/models` to organize providers, release dates, context windows, and status.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {models.map((model) => (
          <Link key={model.slug} href={`/models/${model.slug}`} className="surface-card group space-y-4 transition hover:-translate-y-0.5 hover:border-white/16">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
              <span>{model.provider}</span>
              <span>•</span>
              <span>{model.status}</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-50 group-hover:text-sky-200">
                {model.name}
              </h2>
              <p className="text-sm leading-6 text-slate-300">{model.description}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span>Released: {formatDate(model.releaseDate)}</span>
              <span>Context: {model.contextWindow || "Not set"}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
