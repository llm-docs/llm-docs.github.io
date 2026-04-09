"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type SearchItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  tags?: string[];
};

export default function SearchClient({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items.slice(0, 12);
    }

    return items
      .filter((item) => {
        const haystack = `${item.title} ${item.description} ${(item.tags || []).join(" ")}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 24);
  }, [items, query]);

  return (
    <section className="space-y-6">
      <div className="surface-card space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50">Search the library</h1>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search models, docs, agents, and news..."
          className="w-full rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500"
        />
      </div>
      <div className="grid gap-4">
        {results.map((item) => (
          <Link key={item.id} href={item.url} className="surface-card space-y-2 transition hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{item.type}</p>
            <h2 className="text-xl font-semibold text-slate-50">{item.title}</h2>
            <p className="text-sm leading-6 text-slate-300">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
