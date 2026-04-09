import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/content/Markdown";
import { getAgentBySlug, getAgents } from "@/lib/content";

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

  return {
    title: agent.metadata.name,
    description: agent.metadata.description,
  };
}

export default async function AgentPage({ params }: PageProps) {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);

  if (!agent) {
    notFound();
  }

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-4">
        <div className="space-y-3">
          <p className="eyebrow">{agent.metadata.category}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{agent.metadata.name}</h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-600">{agent.metadata.description}</p>
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
      </header>
      <Markdown source={agent.content} />
    </article>
  );
}
