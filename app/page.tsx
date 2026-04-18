import Link from "next/link";
import { ArrowRight, BookOpenText, Bot, Newspaper, Sparkles } from "lucide-react";

import {
  getAgents,
  getAllModelComparisons,
  getAutomationStatus,
  getDocs,
  getModels,
  getNews,
} from "@/lib/content";

function formatDate(date: string) {
  if (!date) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export default async function HomePage() {
  const [docs, news, agents, models, comparisons, topics] = await Promise.all([
    getDocs(),
    getNews(),
    getAgents(),
    getModels(),
    getAllModelComparisons(),
    import("@/lib/content").then((module) => module.getTopicHubs()),
  ]);
  const automation = await getAutomationStatus();

  const latestDocs = docs.slice(0, 3);
  const latestNews = news.slice(0, 3);
  const featuredAgents = agents.slice(0, 3);
  const latestModels = models.slice(0, 3);
  const featuredComparisons = comparisons.slice(0, 4);
  const popularGuides = docs.slice(0, 4);
  const featuredTopics = topics.slice(0, 4);

  return (
    <div className="space-y-14 pb-16">
      <section className="hero-shell overflow-hidden px-6 py-14 sm:px-8 sm:py-16">
        <div className="max-w-3xl space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            Trusted AI intelligence
          </p>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              The business reference for LLM documentation, model intelligence, and market updates.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-200">
              Follow the latest models, compare providers, discover agent frameworks,
              and access structured documentation built for teams, researchers, and decision-makers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/docs" className="button-primary">
              View Documentation
            </Link>
            <Link href="/news" className="button-secondary">
              See Latest Updates
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 px-6 sm:grid-cols-2 xl:grid-cols-4 xl:px-0">
        <StatCard label="Docs" value={docs.length} description="Foundational guides and references" />
        <StatCard label="Updates" value={news.length} description="Release notes and ecosystem news" />
        <StatCard label="Models" value={models.length} description="Structured model overview pages" />
        <StatCard label="Agents" value={agents.length} description="Tools and orchestration frameworks" />
      </section>

      <section className="surface-card space-y-4 px-6 xl:px-0">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">
          LLM-Docs is built to organize fast-moving AI information into crawlable, linked collections.
        </h2>
        <p className="max-w-4xl text-sm leading-7 text-slate-300">
          Instead of isolated posts, the site now groups documentation, news, model profiles, topic hubs,
          and comparison pages into a connected knowledge graph. That gives users clearer navigation and gives
          search engines stronger signals about topic authority.
        </p>
      </section>

      <section className="px-6 xl:px-0">
        <AutomationPanel
          newsLastRun={automation.news?.lastRunAt ?? ""}
          newsSources={automation.news?.sources ?? []}
          modelLastRun={automation.models?.lastRunAt ?? ""}
          modelSources={automation.models?.sources ?? []}
          modelReviewCount={automation.modelReview?.candidateCount ?? 0}
        />
      </section>

      <ContentSection
        title="Latest updates"
        href="/news"
        icon={<Newspaper className="h-5 w-5" />}
        items={latestNews.map((item) => ({
          href: `/news/${item.slug}`,
          title: item.title,
          description: item.description,
          meta: formatDate(item.date),
        }))}
      />

      <ContentSection
        title="Newest model pages"
        href="/models"
        icon={<Sparkles className="h-5 w-5" />}
        items={latestModels.map((item) => ({
          href: `/models/${item.slug}`,
          title: item.name,
          description: item.description,
          meta: `${item.provider} • ${item.releaseDate ? formatDate(item.releaseDate) : item.status}`,
        }))}
      />

      <ComparisonSection comparisons={featuredComparisons} />

      <ContentSection
        title="Popular guides"
        href="/docs"
        icon={<BookOpenText className="h-5 w-5" />}
        items={popularGuides.map((item) => ({
          href: `/docs/${item.slug}`,
          title: item.title,
          description: item.description,
          meta: `${item.category} • ${formatDate(item.updatedAt || item.date)}`,
        }))}
      />

      <TopicSection topics={featuredTopics.map((topic) => ({
        href: `/topics/${topic.slug}`,
        title: topic.label,
        description: `${topic.count} connected pages across the site.`,
      }))} />

      <ContentSection
        title="Documentation"
        href="/docs"
        icon={<BookOpenText className="h-5 w-5" />}
        items={latestDocs.map((item) => ({
          href: `/docs/${item.slug}`,
          title: item.title,
          description: item.description,
          meta: `${item.category} • ${formatDate(item.date)}`,
        }))}
      />

      <ContentSection
        title="Agent frameworks"
        href="/agents"
        icon={<Bot className="h-5 w-5" />}
        items={featuredAgents.map((item) => ({
          href: `/agents/${item.slug}`,
          title: item.name,
          description: item.description,
          meta: item.category,
        }))}
      />
    </div>
  );
}

function TopicSection({
  topics,
}: {
  topics: { href: string; title: string; description: string }[];
}) {
  return (
    <section className="space-y-5 px-6 xl:px-0">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Topic hubs</h2>
        <Link href="/topics" className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white">
          Browse all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {topics.map((topic) => (
          <Link key={topic.href} href={topic.href} className="surface-card space-y-3 transition hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">Topic Cluster</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-50">{topic.title}</h3>
            <p className="text-sm leading-6 text-slate-300">{topic.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ComparisonSection({
  comparisons,
}: {
  comparisons: { slug: string; title: string; description: string }[];
}) {
  return (
    <section className="space-y-5 px-6 xl:px-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <ArrowRight className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Comparison pages</h2>
          </div>
        </div>
        <Link href="/compare" className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white">
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {comparisons.map((comparison) => (
          <Link
            key={comparison.slug}
            href={`/compare/${comparison.slug}`}
            className="surface-card group space-y-3 transition hover:-translate-y-0.5 hover:border-white/16"
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">Programmatic SEO</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-50 transition group-hover:text-sky-200">
              {comparison.title}
            </h3>
            <p className="text-sm leading-6 text-slate-300">{comparison.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AutomationPanel({
  newsLastRun,
  newsSources,
  modelLastRun,
  modelSources,
  modelReviewCount,
}: {
  newsLastRun: string;
  newsSources: { status: string; sourceName: string }[];
  modelLastRun: string;
  modelSources: { status: string; sourceName: string }[];
  modelReviewCount: number;
}) {
  const newsHealthy = newsSources.filter((source) => source.status === "success").length;
  const modelsHealthy = modelSources.filter((source) => source.status === "success").length;

  return (
    <div className="surface-card grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Automation Status</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">
          The site refreshes itself on GitHub every hour.
        </h2>
        <p className="text-sm leading-6 text-slate-300">
          News and model announcement sources are checked automatically, committed by GitHub Actions,
          and deployed back to the site after each successful sync. The default path is free and uses official provider sources.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.25rem] border border-white/8 bg-[rgba(15,23,42,0.65)] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">News Sync</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">{newsHealthy}/{newsSources.length || 0} sources healthy</p>
          <p className="mt-2 text-sm text-slate-300">Last run: {newsLastRun ? formatDateTime(newsLastRun) : "Not yet recorded"}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/8 bg-[rgba(15,23,42,0.65)] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Model Sync</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">{modelsHealthy}/{modelSources.length || 0} sources healthy</p>
          <p className="mt-2 text-sm text-slate-300">Last run: {modelLastRun ? formatDateTime(modelLastRun) : "Not yet recorded"}</p>
        </div>
        <Link href="/trackers/automation" className="rounded-[1.25rem] border border-white/8 bg-[rgba(15,23,42,0.65)] p-4 transition hover:border-white/16">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Review Queue</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">{modelReviewCount} possible misses</p>
          <p className="mt-2 text-sm text-slate-300">Open the automation tracker to inspect free automatic review candidates.</p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <article className="surface-card space-y-2">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="text-3xl font-semibold text-slate-50">{value}</p>
      <p className="text-sm leading-6 text-slate-300">{description}</p>
    </article>
  );
}

function formatDateTime(date: string) {
  if (!date) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function ContentSection({
  title,
  href,
  icon,
  items,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  items: { href: string; title: string; description: string; meta: string }[];
}) {
  return (
    <section className="space-y-5 px-6 xl:px-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
            {icon}
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-50">{title}</h2>
          </div>
        </div>
        <Link href={href} className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white">
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="surface-card group space-y-3 transition hover:-translate-y-0.5 hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{item.meta}</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-50 transition group-hover:text-sky-200">
              {item.title}
            </h3>
            <p className="text-sm leading-6 text-slate-300">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
