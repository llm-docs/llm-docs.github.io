import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { JsonLd } from "@/components/content/JsonLd";
import { getTopicHubBySlug, getTopicHubs } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const hubs = await getTopicHubs();
  return hubs.map((hub) => ({ slug: hub.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicHubBySlug(slug);

  if (!topic) {
    return {};
  }

  return buildPageMetadata({
    title: `${topic.label} | LLM-Docs`,
    description: `Hub page for ${topic.label} across docs, models, news, and agent references.`,
    path: `/topics/${topic.slug}`,
  });
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = await getTopicHubBySlug(slug);

  if (!topic) {
    notFound();
  }

  return (
    <article className="space-y-8 px-6 pb-16 xl:px-0">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: topic.label,
          url: absoluteUrl(`/topics/${topic.slug}`),
        }}
      />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/topics", label: "Topics" }, { href: `/topics/${topic.slug}`, label: topic.label }]} />
      <header className="space-y-3">
        <p className="eyebrow">Topic Hub</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">{topic.label}</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          {topic.count} linked pages across the LLM-Docs library.
        </p>
      </header>
      <div className="grid gap-4">
        {topic.items.map((item) => (
          <Link key={item.href} href={item.href} className="surface-card space-y-2 transition hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{item.type}</p>
            <h2 className="text-xl font-semibold text-slate-50">{item.label}</h2>
            <p className="text-sm leading-6 text-slate-300">{item.description}</p>
          </Link>
        ))}
      </div>
    </article>
  );
}
