import NewsExplorer from "@/components/explore/NewsExplorer";
import { getNews } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata = buildPageMetadata({
  title: "AI Updates | LLM-Docs",
  description: "Latest LLM, model, and AI ecosystem updates tracked by LLM-Docs.",
  path: "/news",
  type: "website",
});

export default async function NewsIndexPage() {
  const news = await getNews();

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Updates</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Latest LLM updates</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          The feed blends curated markdown entries with automatically imported updates from tracked AI sources.
        </p>
      </header>

      <NewsExplorer items={news} />
    </section>
  );
}
