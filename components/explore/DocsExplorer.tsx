"use client";

import { useState } from "react";
import Link from "next/link";

type DocItem = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags?: string[];
};

export default function DocsExplorer({ docs }: { docs: DocItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = [...new Set(docs.map((doc) => doc.category))].sort();

  const normalized = query.trim().toLowerCase();
  const filtered = docs.filter((doc) => {
    if (category !== "all" && doc.category !== category) return false;
    if (!normalized) return true;
    const haystack = `${doc.title} ${doc.description} ${(doc.tags || []).join(" ")}`.toLowerCase();
    return haystack.includes(normalized);
  });

  return (
    <section className="space-y-6">
      <div className="surface-card grid gap-4 md:grid-cols-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search docs..." className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50">
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((doc) => (
          <Link key={doc.slug} href={`/docs/${doc.slug}`} className="surface-card space-y-3 transition hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{doc.category}</p>
            <h2 className="text-2xl font-semibold text-slate-50">{doc.title}</h2>
            <p className="text-sm leading-6 text-slate-300">{doc.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
