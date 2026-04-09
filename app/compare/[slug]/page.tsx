import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAllModelComparisons, getComparisonBySlug } from "@/lib/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const comparisons = await getAllModelComparisons();
  return comparisons.map((comparison) => ({
    slug: comparison.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const comparison = await getComparisonBySlug(slug);

  if (!comparison) {
    return {};
  }

  return {
    title: comparison.title,
    description: comparison.description,
    keywords: comparison.keywords,
  };
}

export default async function ComparisonPage({ params }: PageProps) {
  const { slug } = await params;
  const comparison = await getComparisonBySlug(slug);

  if (!comparison) {
    notFound();
  }

  const { left, right } = comparison;

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-4">
        <div className="space-y-3">
          <p className="eyebrow">{comparison.category}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{comparison.title}</h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-300">{comparison.description}</p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <ModelPanel model={left} />
        <ModelPanel model={right} />
      </section>

      <section className="surface-card space-y-6">
        <SectionTitle title="Overview" />
        <p className="text-sm leading-7 text-slate-300">
          {left.name} and {right.name} both target modern LLM workflows, but they differ in provider strategy,
          release timing, and the operational signals currently available on this site. Use this page as a research
          entry point, then jump into each model page for deeper notes.
        </p>
      </section>

      <section className="surface-card space-y-6">
        <SectionTitle title="Features" />
        <div className="grid gap-4 md:grid-cols-2">
          <ComparisonRow label="Provider" left={left.provider} right={right.provider} />
          <ComparisonRow label="Status" left={left.status} right={right.status} />
          <ComparisonRow label="Context Window" left={left.contextWindow || "Not set"} right={right.contextWindow || "Not set"} />
          <ComparisonRow label="Modalities" left={left.modalities?.join(", ") || "Not set"} right={right.modalities?.join(", ") || "Not set"} />
        </div>
      </section>

      <section className="surface-card space-y-6">
        <SectionTitle title="Benchmarks" />
        <p className="text-sm leading-7 text-slate-300">
          Benchmark coverage depends on what each provider publicly publishes. This comparison page is structured so
          benchmark fields can be added later without changing the route design or SEO surface.
        </p>
      </section>

      <section className="surface-card space-y-6">
        <SectionTitle title="Pricing" />
        <p className="text-sm leading-7 text-slate-300">
          Pricing is not normalized yet in the current content set. The route is ready for structured pricing data,
          which is a strong next step for programmatic SEO and comparison intent.
        </p>
      </section>

      <section className="surface-card space-y-6">
        <SectionTitle title="Verdict" />
        <p className="text-sm leading-7 text-slate-300">
          If you are comparing {left.name} vs {right.name}, start with provider fit, release freshness, and whether
          your team values commercial polish, open-weight flexibility, or ecosystem compatibility more.
        </p>
      </section>
    </article>
  );
}

function ModelPanel({
  model,
}: {
  model: {
    slug: string;
    name: string;
    provider: string;
    description: string;
    status: string;
  };
}) {
  return (
    <div className="surface-card space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{model.provider}</p>
      <h2 className="text-2xl font-semibold text-slate-50">{model.name}</h2>
      <p className="text-sm leading-6 text-slate-300">{model.description}</p>
      <p className="text-sm text-slate-400">Status: {model.status}</p>
      <Link href={`/models/${model.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-sky-300 hover:text-sky-200">
        View model page
      </Link>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-2xl font-semibold tracking-tight text-slate-50">{title}</h2>;
}

function ComparisonRow({
  label,
  left,
  right,
}: {
  label: string;
  left: string;
  right: string;
}) {
  return (
    <div className="rounded-[1rem] border border-white/8 bg-[rgba(15,23,42,0.6)] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <p className="text-sm text-slate-200">{left}</p>
        <p className="text-sm text-slate-200">{right}</p>
      </div>
    </div>
  );
}
