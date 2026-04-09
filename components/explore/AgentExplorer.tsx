"use client";

import { useState } from "react";
import Link from "next/link";

type AgentItem = {
  slug: string;
  name: string;
  category: string;
  description: string;
  tags?: string[];
};

export default function AgentExplorer({ agents }: { agents: AgentItem[] }) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const categories = [...new Set(agents.map((agent) => agent.category))].sort();

  const normalized = query.trim().toLowerCase();
  const filtered = agents.filter((agent) => {
    if (category !== "all" && agent.category !== category) return false;
    if (!normalized) return true;
    const haystack = `${agent.name} ${agent.description} ${(agent.tags || []).join(" ")}`.toLowerCase();
    return haystack.includes(normalized);
  });

  return (
    <section className="space-y-6">
      <div className="surface-card grid gap-4 md:grid-cols-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents..." className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-white/10 bg-[rgba(15,23,42,0.6)] px-4 py-3 text-slate-50">
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((agent) => (
          <Link key={agent.slug} href={`/agents/${agent.slug}`} className="surface-card group space-y-3 transition hover:border-white/16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{agent.category}</p>
            <h2 className="text-2xl font-semibold text-slate-50 group-hover:text-sky-200">{agent.name}</h2>
            <p className="text-sm leading-6 text-slate-300">{agent.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
