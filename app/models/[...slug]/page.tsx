import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { JsonLd } from "@/components/content/JsonLd";
import { Markdown } from "@/components/content/Markdown";
import { RelatedLinks } from "@/components/content/RelatedLinks";
import { FeedbackLinks } from "@/components/feedback/FeedbackLinks";
import { getRecommendedHardwareForModel, getDeploymentModelByName, getQuantizationTable } from "@/lib/deployment";
import {
  getModelBySlug,
  getModelComparisons,
  getModels,
  getRelatedDocs,
  getRelatedNews,
} from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";

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
    ...buildPageMetadata({
      title: `${model.metadata.name} Guide | LLM-Docs`,
      description: model.metadata.description,
      path: `/models/${slug.join("/")}`,
      image: model.metadata.image,
      type: "article",
      publishedTime: model.metadata.releaseDate,
      modifiedTime: model.metadata.updatedAt,
      tags: model.metadata.tags,
    }),
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

  const [comparisons, relatedDocs, relatedNews] = await Promise.all([
    getModelComparisons(slug.join("/")),
    getRelatedDocs("", model.metadata.tags || []),
    getRelatedNews("", model.metadata.tags || []),
  ]);
  const deploymentProfile = getDeploymentModelByName(model.metadata.name, model.metadata.provider);
  const deploymentHardware = deploymentProfile ? getRecommendedHardwareForModel(deploymentProfile).slice(0, 3) : [];
  const quantizationTable = deploymentProfile ? getQuantizationTable(deploymentProfile).slice(0, 4) : [];

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: model.metadata.name,
          description: model.metadata.description,
          datePublished: model.metadata.releaseDate,
          dateModified: model.metadata.updatedAt,
          url: absoluteUrl(`/models/${slug.join("/")}`),
        }}
      />
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/models", label: "Models" },
          { href: `/models/${slug.join("/")}`, label: model.metadata.name },
        ]}
      />
      <header className="space-y-4">
        <div className="space-y-3">
          <p className="eyebrow">{model.metadata.provider}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{model.metadata.name}</h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-300">{model.metadata.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
            Last updated {model.metadata.updatedAt || model.metadata.releaseDate || "unknown"}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
            Confidence: editorial summary
          </span>
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="surface-card space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Main use cases</p>
            <p className="text-sm leading-6 text-slate-300">
              {model.metadata.useCases?.length ? model.metadata.useCases.join(", ") : "Not specified yet."}
            </p>
          </div>
          <div className="surface-card space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Pricing</p>
            <p className="text-sm leading-6 text-slate-300">{model.metadata.pricing || "Pricing not added yet."}</p>
          </div>
        </div>
        <section className="surface-card space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Deployment planning</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Can this model run on your machine?</h2>
            <p className="text-sm leading-6 text-slate-300">
              Use the estimator to check VRAM, RAM, KV cache, runtime overhead, and hardware fit before deployment.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/calculator" className="button-primary">
              Open calculator
            </Link>
            <Link href="/hardware" className="button-secondary">
              Browse hardware guides
            </Link>
          </div>
          {deploymentProfile ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/8 bg-[rgba(15,23,42,0.55)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Weight memory snapshot</p>
                <div className="mt-3 space-y-2">
                  {quantizationTable.map((row) => (
                    <div key={row.quantization} className="flex items-center justify-between text-sm text-slate-300">
                      <span>{row.label}</span>
                      <span>{row.weightMemoryGB} GB</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-[rgba(15,23,42,0.55)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Recommended hardware</p>
                <div className="mt-3 space-y-3">
                  {deploymentHardware.map(({ hardware, estimate }) => (
                    <div key={hardware.id} className="flex items-start justify-between gap-3 text-sm text-slate-300">
                      <div>
                        <p className="font-medium text-slate-100">{hardware.name}</p>
                        <p>{estimate.totalRequiredGB} GB total at Q4 / 8k context</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-xs capitalize text-slate-200">
                        {estimate.fitTier}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>
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
      <RelatedLinks
        title="Setup guides"
        items={relatedDocs.map((doc) => ({
          href: `/docs/${doc.slug}`,
          label: doc.title,
          description: doc.description,
        }))}
      />
      <RelatedLinks
        title="Related updates"
        items={relatedNews.map((item) => ({
          href: `/news/${item.slug}`,
          label: item.title,
          description: item.description,
        }))}
      />
      <FeedbackLinks context={model.metadata.name} />
    </article>
  );
}
