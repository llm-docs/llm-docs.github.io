import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/content/Markdown";
import { getModelBySlug, getModelComparisons, getModels } from "@/lib/content";

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateStaticParams() {
  const models = await getModels();
  return models.map((model) => ({
    slug: model.slug.split("/"),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const model = await getModelBySlug(slug.join("/"));

  if (!model) {
    return {};
  }

  return {
    title: `${model.metadata.name} Model Overview`,
    description: model.metadata.description,
    keywords: [
      model.metadata.name,
      `${model.metadata.name} pricing`,
      `${model.metadata.name} benchmarks`,
      `${model.metadata.name} use cases`,
    ],
  };
}

export default async function ModelPage({ params }: PageProps) {
  const { slug } = await params;
  const model = await getModelBySlug(slug.join("/"));

  if (!model) {
    notFound();
  }

  const comparisons = await getModelComparisons(slug.join("/"));

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-4">
        <div className="space-y-3">
          <p className="eyebrow">{model.metadata.provider}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{model.metadata.name}</h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-300">{model.metadata.description}</p>
        </div>
        <dl className="grid gap-3 rounded-[1.5rem] border border-white/8 bg-[rgba(9,15,32,0.8)] p-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Status</dt>
            <dd className="mt-2 text-sm text-slate-100">{model.metadata.status}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Release date</dt>
            <dd className="mt-2 text-sm text-slate-100">{model.metadata.releaseDate || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Context window</dt>
            <dd className="mt-2 text-sm text-slate-100">{model.metadata.contextWindow || "Not set"}</dd>
          </div>
        </dl>
      </header>

      {comparisons.length > 0 ? (
        <section className="surface-card space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Comparisons</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Related comparisons</h2>
            <p className="text-sm leading-6 text-slate-300">
              Compare this model against adjacent providers and alternatives.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {comparisons.map((comparison) => (
              <Link
                key={comparison.slug}
                href={`/compare/${comparison.slug}`}
                className="rounded-[1rem] border border-white/8 bg-[rgba(15,23,42,0.6)] p-4 transition hover:border-white/16"
              >
                <h3 className="text-lg font-semibold text-slate-50">{comparison.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{comparison.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Markdown source={model.content} />
    </article>
  );
}
