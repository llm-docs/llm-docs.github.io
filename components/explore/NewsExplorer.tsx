"use client";

import { useState } from "react";
import Link from "next/link";

type NewsItem = {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string;
  tags?: string[];
};

export default function NewsExplorer({ items }: { items: NewsItem[] }) {
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("all");
  const companies = [...new Set(items.map((item) => item.author))].sort();

  const normalized = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (company !== "all" && item.author !== company) return false;
    if (!normalized) return true;
    const haystack = `${item.title} ${item.description} ${item.author} ${(item.tags || []).join(" ")}`.toLowerCase();
    return haystack.includes(normalized);
  });

  return (
    <section className="space-y-6">
      <div className="surface-card grid gap-4 md:grid-cols-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search updates..." className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50" />
        <select value={company} onChange={(event) => setCompany(event.target.value)} className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50">
          <option value="all">All sources</option>
          {companies.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="grid gap-4">
        {filtered.map((item) => (
          <Link key={item.slug} href={`/news/${item.slug}`} className="surface-card group space-y-2 transition hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{item.author}</p>
            <h2 className="text-xl font-semibold text-slate-50 group-hover:text-sky-200">{item.title}</h2>
            <p className="text-sm leading-6 text-slate-300">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
