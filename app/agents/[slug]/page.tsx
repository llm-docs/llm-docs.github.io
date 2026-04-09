import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { JsonLd } from "@/components/content/JsonLd";
import { Markdown } from "@/components/content/Markdown";
import { RelatedLinks } from "@/components/content/RelatedLinks";
import { getAgentBySlug, getAgents, getRelatedAgents, getRelatedDocs, getRelatedModels } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const agents = await getAgents();
  return agents.map((agent) => ({
    slug: agent.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);

  if (!agent) {
    return {};
  }

  return buildPageMetadata({
    title: `${agent.metadata.name} Guide | LLM-Docs`,
    description: agent.metadata.description,
    path: `/agents/${slug}`,
    type: "article",
    modifiedTime: agent.metadata.updatedAt,
    tags: agent.metadata.tags,
  });
}

export default async function AgentPage({ params }: PageProps) {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);

  if (!agent) {
    notFound();
  }

  const [relatedDocs, relatedModels, relatedAgents] = await Promise.all([
    getRelatedDocs("", agent.metadata.tags || []),
    getRelatedModels("", agent.metadata.tags || []),
    getRelatedAgents(slug, agent.metadata.tags || []),
  ]);

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: agent.metadata.name,
          description: agent.metadata.description,
          dateModified: agent.metadata.updatedAt,
          url: absoluteUrl(`/agents/${slug}`),
        }}
      />
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/agents", label: "Agents" },
          { href: `/agents/${slug}`, label: agent.metadata.name },
        ]}
      />
      <header className="space-y-4">
        <div className="space-y-3">
          <p className="eyebrow">{agent.metadata.category}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{agent.metadata.name}</h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-300">{agent.metadata.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {agent.metadata.url ? (
            <Link href={agent.metadata.url} className="button-primary">
              Official site
            </Link>
          ) : null}
          {agent.metadata.github ? (
            <Link href={agent.metadata.github} className="button-secondary">
              GitHub
            </Link>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="surface-card space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Best use cases</p>
            <p className="text-sm leading-6 text-slate-300">
              {agent.metadata.useCases?.length ? agent.metadata.useCases.join(", ") : "Use cases not added yet."}
            </p>
          </div>
          <div className="surface-card space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Alternatives</p>
            <p className="text-sm leading-6 text-slate-300">
              {agent.metadata.alternatives?.length ? agent.metadata.alternatives.join(", ") : "Alternatives not added yet."}
            </p>
          </div>
        </div>
      </header>
      <Markdown source={agent.content} />
      <RelatedLinks
        title="Related docs"
        items={relatedDocs.map((doc) => ({
          href: `/docs/${doc.slug}`,
          label: doc.title,
          description: doc.description,
        }))}
      />
      <RelatedLinks
        title="Related models"
        items={relatedModels.map((model) => ({
          href: `/models/${model.slug}`,
          label: model.name,
          description: model.description,
        }))}
      />
      <RelatedLinks
        title="Alternatives and adjacent tools"
        items={relatedAgents.map((item) => ({
          href: `/agents/${item.slug}`,
          label: item.name,
          description: item.description,
        }))}
      />
    </article>
  );
}
