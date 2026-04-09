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
  const [type, setType] = useState("all");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = items
      .filter((item) => (type === "all" ? true : item.type === type))
      .filter((item) => {
        if (!normalized) {
          return true;
        }

        const haystack = `${item.title} ${item.description} ${(item.tags || []).join(" ")}`.toLowerCase();
        return haystack.includes(normalized) || fuzzyMatch(haystack, normalized);
      })
      .slice(0, 24);

    return filtered;
  }, [items, query, type]);

  const grouped = useMemo(() => {
    return {
      docs: results.filter((item) => item.type === "doc"),
      news: results.filter((item) => item.type === "news"),
      models: results.filter((item) => item.type === "model"),
      agents: results.filter((item) => item.type === "agent"),
    };
  }, [results]);

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
        <div className="flex flex-wrap gap-2">
          {["all", "doc", "news", "model", "agent"].map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setType(entry)}
              className={`rounded-full border px-3 py-2 text-sm transition ${
                type === entry
                  ? "border-sky-400 bg-sky-400/15 text-sky-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"
              }`}
            >
              {entry === "all" ? "All" : `${entry[0].toUpperCase()}${entry.slice(1)}s`}
            </button>
          ))}
        </div>
      </div>
      <ResultGroup title="Docs" query={query} items={grouped.docs} />
      <ResultGroup title="News" query={query} items={grouped.news} />
      <ResultGroup title="Models" query={query} items={grouped.models} />
      <ResultGroup title="Agents" query={query} items={grouped.agents} />
    </section>
  );
}

function ResultGroup({
  title,
  items,
  query,
}: {
  title: string;
  items: SearchItem[];
  query: string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-slate-50">{title}</h2>
      <div className="grid gap-4">
        {items.map((item) => (
          <Link key={item.id} href={item.url} className="surface-card space-y-2 transition hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{item.type}</p>
            <h3 className="text-xl font-semibold text-slate-50">{highlight(item.title, query)}</h3>
            <p className="text-sm leading-6 text-slate-300">{highlight(item.description, query)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function highlight(text: string, query: string) {
  if (!query.trim()) {
    return text;
  }

  const normalized = query.trim().toLowerCase();
  const index = text.toLowerCase().indexOf(normalized);
  if (index === -1) {
    return text;
  }

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-sky-400/20 px-1 text-sky-200">{text.slice(index, index + normalized.length)}</mark>
      {text.slice(index + normalized.length)}
    </>
  );
}

function fuzzyMatch(haystack: string, query: string) {
  let pointer = 0;
  for (const char of haystack) {
    if (char === query[pointer]) {
      pointer += 1;
      if (pointer === query.length) {
        return true;
      }
    }
  }

  return false;
}
