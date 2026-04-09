"use client";

import { useState } from "react";
import Link from "next/link";

type ModelItem = {
  slug: string;
  name: string;
  provider: string;
  description: string;
  status: string;
  contextWindow?: string;
  modalities?: string[];
  pricing?: string;
  tags?: string[];
  releaseDate?: string;
};

export default function ModelExplorer({ models }: { models: ModelItem[] }) {
  const [provider, setProvider] = useState("all");
  const [sortBy, setSortBy] = useState("release");
  const [query, setQuery] = useState("");

  const providers = [...new Set(models.map((model) => model.provider))].sort();

  const normalized = query.trim().toLowerCase();
  const filtered = [...models]
    .filter((model) => (provider === "all" ? true : model.provider === provider))
    .filter((model) => {
      if (!normalized) return true;
      const haystack = `${model.name} ${model.description} ${model.provider} ${(model.tags || []).join(" ")}`.toLowerCase();
      return haystack.includes(normalized);
    })
    .sort((left, right) => {
      if (sortBy === "name") return left.name.localeCompare(right.name);
      return new Date(right.releaseDate || 0).getTime() - new Date(left.releaseDate || 0).getTime();
    });

  return (
    <section className="space-y-6">
      <div className="surface-card grid gap-4 md:grid-cols-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models..." className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50" />
        <select value={provider} onChange={(event) => setProvider(event.target.value)} className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50">
          <option value="all">All providers</option>
          {providers.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50">
          <option value="release">Newest first</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((model) => (
          <Link key={model.slug} href={`/models/${model.slug}`} className="surface-card group space-y-4 transition hover:border-white/16">
            <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
              <span>{model.provider}</span>
              <span>•</span>
              <span>{model.status}</span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-50 group-hover:text-sky-200">{model.name}</h2>
            <p className="text-sm leading-6 text-slate-300">{model.description}</p>
            <p className="text-sm text-slate-400">Context window: {model.contextWindow || "Not set"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
