import Link from "next/link";

import { getTopicHubs } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "Topic Hubs | LLM-Docs",
  description: "Topic clusters across models, docs, agents, and news on LLM-Docs.",
  path: "/topics",
});

export default async function TopicsPage() {
  const topics = await getTopicHubs();

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Topics</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Topic clusters</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          Browse major AI themes, provider ecosystems, and core subject areas in one place.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {topics.map((topic) => (
          <Link key={topic.slug} href={`/topics/${topic.slug}`} className="surface-card space-y-3 transition hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{topic.count} pages</p>
            <h2 className="text-2xl font-semibold text-slate-50">{topic.label}</h2>
            <p className="text-sm leading-6 text-slate-300">
              Curated links, updates, and references connected to {topic.label}.
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
