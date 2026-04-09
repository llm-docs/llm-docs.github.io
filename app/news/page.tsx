import Link from "next/link";

import { getNews } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";

function formatDate(date: string) {
  if (!date) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(date));
}

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

      <div className="space-y-4">
        {news.map((item) => (
          <Link key={item.slug} href={`/news/${item.slug}`} className="surface-card group block space-y-3 transition hover:-translate-y-0.5 hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
              {formatDate(item.date)} • {item.author}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-50 group-hover:text-sky-200">
              {item.title}
            </h2>
            <p className="text-sm leading-6 text-slate-300">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
