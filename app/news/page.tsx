import Link from "next/link";

import { getNews } from "@/lib/content";

function formatDate(date: string) {
  if (!date) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export const metadata = {
  title: "Updates",
  description: "Latest LLM and AI ecosystem updates",
};

export default async function NewsIndexPage() {
  const news = await getNews();

  return (
    <section className="space-y-8 px-6 pb-16 xl:px-0">
      <header className="space-y-3">
        <p className="eyebrow">Updates</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Latest LLM updates</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">
          The feed blends curated markdown entries with automatically imported updates from tracked AI sources.
        </p>
      </header>

      <div className="space-y-4">
        {news.map((item) => (
          <Link key={item.slug} href={`/news/${item.slug}`} className="surface-card group block space-y-3 transition hover:-translate-y-0.5 hover:border-slate-300">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
              {formatDate(item.date)} • {item.author}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 group-hover:text-slate-700">
              {item.title}
            </h2>
            <p className="text-sm leading-6 text-slate-600">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
