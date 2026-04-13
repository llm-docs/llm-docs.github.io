import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { FeedbackLinks } from "@/components/feedback/FeedbackLinks";
import { RelatedLinks } from "@/components/content/RelatedLinks";
import { getProviderHubBySlug, getProviderHubs } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const providers = await getProviderHubs();
  return providers.map((provider) => ({ slug: provider.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProviderHubBySlug(slug);
  if (!provider) return {};
  return buildPageMetadata({
    title: `${provider.label} | LLM-Docs`,
    description: `${provider.label} overview page with models, guides, news, comparisons, and FAQs.`,
    path: `/providers/${provider.slug}`,
  });
}

export default async function ProviderPage({ params }: PageProps) {
  const { slug } = await params;
  const provider = await getProviderHubBySlug(slug);
  if (!provider) notFound();

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/providers", label: "Providers" }, { href: `/providers/${provider.slug}`, label: provider.label }]} />
      <header className="space-y-3">
        <p className="eyebrow">Provider Hub</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{provider.label}</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-300">
          {provider.label} hub page with model pages, related guides, recent updates, comparisons, and common questions.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface-card space-y-2"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Models</p><p className="text-2xl font-semibold text-slate-50">{provider.models.length}</p></div>
        <div className="surface-card space-y-2"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Recent updates</p><p className="text-2xl font-semibold text-slate-50">{provider.news.length}</p></div>
        <div className="surface-card space-y-2"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Comparisons</p><p className="text-2xl font-semibold text-slate-50">{provider.comparisons.length}</p></div>
      </div>

      <RelatedLinks title="Key guides" items={provider.docs.slice(0, 4).map((doc) => ({ href: `/docs/${doc.slug}`, label: doc.title, description: doc.description }))} />
      <RelatedLinks title="Related models" items={provider.models.slice(0, 6).map((model) => ({ href: `/models/${model.slug}`, label: model.name, description: model.description }))} />
      <RelatedLinks title="Recent news" items={provider.news.slice(0, 6).map((item) => ({ href: `/news/${item.slug}`, label: item.title, description: item.description }))} />
      <RelatedLinks title="Comparison pages" items={provider.comparisons.slice(0, 6).map((comparison) => ({ href: `/compare/${comparison.slug}`, label: comparison.title, description: comparison.description }))} />

      <section className="surface-card space-y-4">
        <h2 className="text-2xl font-semibold text-slate-50">FAQ</h2>
        <div className="space-y-4 text-sm leading-7 text-slate-300">
          <div>
            <h3 className="font-semibold text-slate-100">What does this provider hub include?</h3>
            <p>It includes provider-related model pages, supporting guides, recent updates, and comparison routes.</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">How often is this page updated?</h3>
            <p>The linked content updates as the underlying news sync, model sync, and editorial pages change.</p>
          </div>
        </div>
      </section>

      <FeedbackLinks context={`${provider.label} provider hub`} />
    </article>
  );
}
