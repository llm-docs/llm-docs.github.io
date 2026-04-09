import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/content/Markdown";
import { getModelBySlug, getModels } from "@/lib/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const models = await getModels();
  return models.map((model) => ({
    slug: model.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const model = await getModelBySlug(slug);

  if (!model) {
    return {};
  }

  return {
    title: model.metadata.name,
    description: model.metadata.description,
  };
}

export default async function ModelPage({ params }: PageProps) {
  const { slug } = await params;
  const model = await getModelBySlug(slug);

  if (!model) {
    notFound();
  }

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
      <Markdown source={model.content} />
    </article>
  );
}
